import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { env } from "../../config/env.js";
import { webauthnRoutes } from "./webauthn.js";

// ponytail: frontend usa Supabase JS direto (login/persist/refresh nativos).
// Estas rotas são bindings finos ao mesmo SDK. Use se algum consumer não-web
// precisar do fluxo via HTTP; senão, é redundante.
const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  nome:     z.string().min(1),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  await app.register(webauthnRoutes);

  app.post("/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);

    const { email, password, nome } = parsed.data;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error) return reply.badRequest(error.message);
    return { user: { id: data.user.id, email: data.user.email, nome } };
  });

  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);

    // Cliente anônimo isolado — não persistimos sessão no server.
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error) return reply.unauthorized(error.message);
    return { session: data.session, user: data.user };
  });
};
