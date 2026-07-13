import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  // Aceita 1 URL ou várias separadas por vírgula (localhost + produção Vercel + previews).
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),

  JWT_SECRET: z.string().min(16),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:\n", parsed.error.format());
  throw new Error("Config inválida — cheque o .env.");
}

export const env = parsed.data;
