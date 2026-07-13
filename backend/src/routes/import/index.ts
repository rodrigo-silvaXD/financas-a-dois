import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { anthropic, ANTHROPIC_MODEL } from "../../lib/anthropic.js";
import { clientFromRequest } from "../../lib/user-supabase.js";
import { normalize } from "../../lib/normalize.js";

export type ParsedTx = {
  data: string;              // YYYY-MM-DD
  descricao: string;
  valor: number;             // sinal preservado: negativo = gasto, positivo = entrada
  id_externo: string | null; // FITID do OFX ou identificador único, se disponível
};

// ────────────────────────────────────────────────────────────────
// OFX parser — SGML tag-based, sem lib externa.
// ────────────────────────────────────────────────────────────────
function parseOfx(text: string): ParsedTx[] {
  const out: ParsedTx[] = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const chunk = m[1] ?? "";
    const tag = (name: string) => {
      // aceita <TAG>value com ou sem tag de fechamento (formato OFX SGML)
      const r = new RegExp(`<${name}>([^<\\r\\n]+)`, "i");
      const mm = chunk.match(r);
      return mm && mm[1] ? mm[1].trim() : "";
    };
    const dtRaw = tag("DTPOSTED");    // 20260315120000[-03:BRT] ou 20260315
    const trnamt = tag("TRNAMT");
    const memo = tag("MEMO") || tag("NAME");
    const fitid = tag("FITID");
    if (!dtRaw || !trnamt) continue;
    const data = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`;
    const valor = Number(trnamt.replace(",", "."));
    if (!Number.isFinite(valor)) continue;
    out.push({ data, descricao: memo.trim(), valor, id_externo: fitid || null });
  }
  return out;
}

const parseOfxSchema = z.object({ text: z.string().min(1) });

const parsePdfSchema = z.object({
  pdf_base64: z.string().min(100),
  data_hoje: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const enrichSchema = z.object({
  itens: z.array(z.object({ descricao: z.string(), data: z.string(), valor: z.number() })).min(1).max(500),
  categorias: z.array(z.string()).min(1),
});

const monthlySummarySchema = z.object({
  year_month: z.string().regex(/^\d{4}-\d{2}$/),
});

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch { /* segue */ }
  const m = trimmed.match(/[\[{][\s\S]*[\]}]/);
  if (!m) throw new Error("IA não devolveu JSON.");
  return JSON.parse(m[0]);
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  // ── OFX: parse local, retorna transações
  app.post("/parse-ofx", async (req, reply) => {
    const parsed = parseOfxSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    return { transactions: parseOfx(parsed.data.text) };
  });

  // ── PDF: passa pra Claude Haiku 4.5, que aceita PDF nativamente
  app.post("/parse-pdf", async (req, reply) => {
    const parsed = parsePdfSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { pdf_base64, data_hoje } = parsed.data;

    const system =
      `Você é um assistente que extrai transações de extratos bancários em PDF. ` +
      `Para cada transação encontrada, extraia: data (YYYY-MM-DD; se ano não visível, use ${data_hoje.slice(0, 4)}), ` +
      `descricao (nome do estabelecimento/operação, curto), valor (number; negativo para saídas, positivo para entradas). ` +
      `Responda APENAS com JSON válido, sem markdown, no formato: {"transactions":[{"data":"...","descricao":"...","valor":...}]}`;

    try {
      const msg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf_base64 } },
            { type: "text", text: "Extraia as transações conforme instruído." },
          ],
        }],
      });
      const block = msg.content.find((c: any) => c.type === "text");
      const raw = block?.type === "text" ? block.text : "";
      const parsed = extractJson(raw) as { transactions: ParsedTx[] };
      return { transactions: parsed.transactions ?? [] };
    } catch (err) {
      return reply.internalServerError(err instanceof Error ? err.message : "Falha na IA");
    }
  });

  // ── Enrich: pra cada tx, tenta rule; se nenhuma bate, uma chamada de IA em batch
  app.post("/enrich", async (req, reply) => {
    const parsed = enrichSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { itens, categorias } = parsed.data;

    let supabase;
    try { supabase = clientFromRequest(req); }
    catch { return reply.unauthorized("Sem token."); }

    // Carrega todas as rules do usuário
    const { data: rules } = await supabase
      .from("category_rules")
      .select("pattern, category_id, vezes_usado")
      .order("vezes_usado", { ascending: false })
      .limit(500);
    const rs = (rules ?? []) as { pattern: string; category_id: string }[];

    // 1) Tentativa por rules
    type Enriched = {
      descricao: string; data: string; valor: number;
      via: "rule" | "ia" | "none";
      category_id?: string; category_name?: string;
    };
    const preliminar: Enriched[] = itens.map((it) => {
      const target = normalize(it.descricao);
      const hit = target
        ? rs.find((r) => target.includes(r.pattern) || r.pattern.includes(target))
        : undefined;
      return hit
        ? { ...it, via: "rule", category_id: hit.category_id }
        : { ...it, via: "none" };
    });

    // 2) IA nos que sobraram (uma chamada só)
    const semRule = preliminar.filter((p) => p.via === "none");
    if (semRule.length > 0) {
      const listaDesc = semRule.map((p) => p.descricao);
      const system =
        `Você é um assistente financeiro. Para cada descrição, escolha a categoria mais próxima da lista: ${JSON.stringify(categorias)}. ` +
        `Responda APENAS com JSON válido no formato: {"resultados":[{"descricao":"...","categoria_nome":"..."}]}. ` +
        `Se não conseguir decidir, use "Outros".`;
      try {
        const msg = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 2000,
          system,
          messages: [{ role: "user", content: JSON.stringify(listaDesc) }],
        });
        const block = msg.content.find((c: any) => c.type === "text");
        const raw = block?.type === "text" ? block.text : "";
        const resp = extractJson(raw) as { resultados?: { descricao: string; categoria_nome: string }[] };
        const map = new Map<string, string>();
        for (const r of resp.resultados ?? []) map.set(r.descricao, r.categoria_nome);
        for (const p of preliminar) {
          if (p.via !== "none") continue;
          const nome = map.get(p.descricao);
          if (nome) { p.via = "ia"; p.category_name = nome; }
        }
      } catch { /* ignora — IA falhou, itens ficam sem categoria e user escolhe */ }
    }

    return { itens: preliminar };
  });

  // ── Resumo mensal narrativo (com cache em monthly_summaries)
  app.post("/monthly-summary", async (req, reply) => {
    const parsed = monthlySummarySchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { year_month } = parsed.data;

    let supabase;
    try { supabase = clientFromRequest(req); }
    catch { return reply.unauthorized("Sem token."); }

    // Cache
    const { data: cached } = await supabase.from("monthly_summaries")
      .select("texto, generated_at").eq("year_month", year_month).maybeSingle();
    if (cached) return { texto: cached.texto, cached: true, generated_at: cached.generated_at };

    // Janela do mês corrente e anterior
    const parts = year_month.split("-").map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 1;
    const iniAtual = `${year_month}-01`;
    const proximo = new Date(y, m, 1);
    const fimAtual = proximo.toISOString().slice(0, 10);
    const anteriorInicio = new Date(y, m - 2, 1).toISOString().slice(0, 10);

    const { data: tx } = await supabase.from("transactions")
      .select("tipo, valor, data, categoria:categories(nome)")
      .gte("data", anteriorInicio).lt("data", fimAtual);

    if (!tx || tx.length === 0) {
      return reply.badRequest("Sem dados suficientes para resumir este mês.");
    }

    type Row = { tipo: "gasto" | "entrada"; valor: number; data: string; categoria: { nome: string } | null };
    const rows = tx as unknown as Row[];
    const atualStart = iniAtual;

    const agrega = (filtro: (r: Row) => boolean) => {
      const out = { entradas: 0, gastos: 0, porCategoria: new Map<string, number>() };
      for (const r of rows.filter(filtro)) {
        const v = Number(r.valor);
        if (r.tipo === "entrada") out.entradas += v;
        else {
          out.gastos += v;
          const cat = r.categoria?.nome ?? "Sem categoria";
          out.porCategoria.set(cat, (out.porCategoria.get(cat) ?? 0) + v);
        }
      }
      return out;
    };

    const atual    = agrega((r) => r.data >= atualStart);
    const anterior = agrega((r) => r.data <  atualStart);

    const dados = {
      atual: {
        entradas: atual.entradas, gastos: atual.gastos, economia: atual.entradas - atual.gastos,
        top_categorias: Array.from(atual.porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5),
      },
      anterior: {
        entradas: anterior.entradas, gastos: anterior.gastos, economia: anterior.entradas - anterior.gastos,
      },
    };

    const system =
      `Você é um assistente financeiro pessoal falando em português brasileiro, de forma amigável e direta. ` +
      `Baseado nos dados financeiros deste mês, escreva um resumo em 3-4 frases curtas destacando: ` +
      `o que mais pesou no orçamento, se houve melhora ou piora comparado ao mês passado, ` +
      `e uma dica prática pra próximo mês. ` +
      `Responda APENAS com o texto do resumo, sem JSON, sem markdown.`;

    try {
      const msg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: JSON.stringify(dados) }],
      });
      const block = msg.content.find((c: any) => c.type === "text");
      const texto = (block?.type === "text" ? block.text : "").trim();
      if (!texto) return reply.internalServerError("Resumo vazio da IA");

      await supabase.from("monthly_summaries").insert({ year_month, texto });
      return { texto, cached: false };
    } catch (err) {
      return reply.internalServerError(err instanceof Error ? err.message : "Falha na IA");
    }
  });
};
