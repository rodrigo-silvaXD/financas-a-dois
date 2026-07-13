import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { anthropic, ANTHROPIC_MODEL } from "../../lib/anthropic.js";
import { clientFromRequest } from "../../lib/user-supabase.js";
import { normalize } from "../../lib/normalize.js";

const parseTextSchema = z.object({
  texto: z.string().min(1),
  categorias: z.array(z.string()).min(1),
  data_hoje: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const parseReceiptSchema = z.object({
  image_base64: z.string().min(50),
  media_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data_hoje: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const suggestSchema = z.object({
  descricao: z.string().min(1),
});

// Extrai bloco JSON mesmo se o modelo devolveu com prosa acidental.
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch { /* segue */ }
  const m = trimmed.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("IA não devolveu JSON.");
  return JSON.parse(m[0]);
}

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ domain: "ai", model: ANTHROPIC_MODEL, status: "ok" }));

  // ── Texto → estrutura de transação
  app.post("/parse-text", async (req, reply) => {
    const parsed = parseTextSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { texto, categorias, data_hoje } = parsed.data;

    const system =
      `Você é um assistente financeiro. Extraia do texto do usuário: valor (number), tipo ('gasto' ou 'entrada'), ` +
      `categoria_nome (escolha a mais próxima desta lista: ${JSON.stringify(categorias)}), ` +
      `descricao (string curta), data (YYYY-MM-DD; se não mencionada, use "${data_hoje}"). ` +
      `Responda APENAS com JSON válido, sem markdown, sem explicação: ` +
      `{"valor": number, "tipo": "gasto"|"entrada", "categoria_nome": string|null, "descricao": string|null, "data": string}`;

    try {
      const msg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: texto }],
      });
      const raw = msg.content.find((c) => c.type === "text")?.text ?? "";
      return extractJson(raw);
    } catch (err) {
      return reply.internalServerError(err instanceof Error ? err.message : "Falha na IA");
    }
  });

  // ── Foto de recibo → estrutura
  app.post("/parse-receipt", async (req, reply) => {
    const parsed = parseReceiptSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { image_base64, media_type, data_hoje } = parsed.data;

    const system =
      `Você é um assistente financeiro. Analise esta foto de nota fiscal/recibo/comprovante. ` +
      `Extraia: valor_total (number), itens (array de {nome, valor} — omita se ilegível), ` +
      `estabelecimento (string ou null), data (YYYY-MM-DD se visível, senão "${data_hoje}"). ` +
      `Responda APENAS com JSON válido, sem markdown: ` +
      `{"valor_total": number, "itens": [{"nome": string, "valor": number}] | null, "estabelecimento": string|null, "data": string}`;

    try {
      const msg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 800,
        system,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            { type: "text", text: "Extraia os dados do recibo conforme instruído." },
          ],
        }],
      });
      const raw = msg.content.find((c) => c.type === "text")?.text ?? "";
      return extractJson(raw);
    } catch (err) {
      return reply.internalServerError(err instanceof Error ? err.message : "Falha na IA");
    }
  });

  // ── Sugestão via category_rules antes de gastar tokens com IA
  app.get("/suggest-category", async (req, reply) => {
    const parsed = suggestSchema.safeParse(req.query);
    if (!parsed.success) return reply.badRequest(parsed.error.message);

    let supabase;
    try { supabase = clientFromRequest(req); }
    catch { return reply.unauthorized("Sem token."); }

    const target = normalize(parsed.data.descricao);
    if (!target) return { category_id: null };

    // Match: pattern contido em target ou target contido em pattern (RLS filtra ao dono).
    const { data, error } = await supabase
      .from("category_rules")
      .select("pattern, category_id, vezes_usado")
      .order("vezes_usado", { ascending: false })
      .limit(50);
    if (error) return reply.internalServerError(error.message);

    const hit = (data ?? []).find(
      (r: { pattern: string }) => target.includes(r.pattern) || r.pattern.includes(target),
    );
    return { category_id: hit?.category_id ?? null };
  });
};
