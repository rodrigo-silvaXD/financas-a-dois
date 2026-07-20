import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase.js";
import { env } from "../../config/env.js";
import { pushReady, sendPushToUser } from "../../lib/push.js";

async function userFromRequest(req: FastifyRequest) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const notifyCoupleSchema = z.object({
  couple_account_id: z.string().uuid(),
  tipo: z.enum(["deposito", "retirada"]),
  valor: z.number().positive(),
  descricao: z.string().nullable().optional(),
});

export const pushRoutes: FastifyPluginAsync = async (app) => {
  // ── Chave pública VAPID pro frontend usar no subscribe ──
  app.get("/vapid-public-key", async () => ({
    key: env.VAPID_PUBLIC_KEY ?? null,
    enabled: pushReady(),
  }));

  // ── Subscribe / Unsubscribe ──
  app.post("/subscribe", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { endpoint, keys } = parsed.data;

    const ua = req.headers["user-agent"] ?? null;
    const { error } = await supabaseAdmin.from("push_subscriptions")
      .upsert({
        user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: ua,
      }, { onConflict: "endpoint" });
    if (error) return reply.internalServerError(error.message);
    return { ok: true };
  });

  app.post("/unsubscribe", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    const parsed = z.object({ endpoint: z.string().url() }).safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    await supabaseAdmin.from("push_subscriptions")
      .delete().eq("user_id", user.id).eq("endpoint", parsed.data.endpoint);
    return { ok: true };
  });

  // ── Teste (chamado do Perfil) ──
  app.post("/test", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    if (!pushReady()) return reply.badRequest("Push não configurado no servidor.");
    const n = await sendPushToUser(user.id, {
      title: "Finanças a Dois",
      body: "Notificações ativas neste aparelho ✓",
      tag: "test",
    });
    return { sent: n };
  });

  // ── Notificar parceiro sobre movimento na conta do casal ──
  // Chamado pelo frontend depois de addCoupleEntry — mais simples do que
  // trigger no Postgres (que precisaria de http/pg_net).
  app.post("/notify-couple", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    const parsed = notifyCoupleSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { couple_account_id, tipo, valor, descricao } = parsed.data;

    // Descobre a família dessa couple_account.
    const { data: ca } = await supabaseAdmin
      .from("couple_accounts").select("family_id").eq("id", couple_account_id).single();
    if (!ca) return reply.notFound("Conta do casal não encontrada.");

    // Confere que quem chamou é membro dessa família (senão qualquer user notificaria qualquer casal).
    const { data: me } = await supabaseAdmin.from("family_members")
      .select("id").eq("family_id", ca.family_id).eq("user_id", user.id).eq("status", "ativo").maybeSingle();
    if (!me) return reply.forbidden("Você não pertence a essa família.");

    // Busca o(s) outro(s) membro(s) ativo(s).
    const { data: parceiros } = await supabaseAdmin.from("family_members")
      .select("user_id").eq("family_id", ca.family_id).eq("status", "ativo").neq("user_id", user.id);
    if (!parceiros || parceiros.length === 0) return { sent: 0 };

    // Nome do autor pra personalizar msg.
    const { data: prof } = await supabaseAdmin.from("profiles")
      .select("nome").eq("id", user.id).single();
    const autor = prof?.nome ?? "Parceiro(a)";

    const valorFmt = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const verbo = tipo === "deposito" ? "depositou" : "retirou";
    const body = descricao
      ? `${autor} ${verbo} ${valorFmt} — ${descricao}`
      : `${autor} ${verbo} ${valorFmt} da conta do casal`;

    let total = 0;
    for (const p of parceiros) {
      total += await sendPushToUser(p.user_id as string, {
        title: "Conta do casal",
        body,
        url: "/casal",
        tag: `couple-${couple_account_id}`,
      });
    }
    return { sent: total };
  });
};
