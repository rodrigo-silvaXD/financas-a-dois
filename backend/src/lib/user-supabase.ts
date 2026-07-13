import type { FastifyRequest } from "fastify";
import { supabaseForUser } from "./supabase.js";

/**
 * Extrai o Bearer token do request e devolve um cliente Supabase autenticado.
 * Lança se não houver token — respeita RLS quando o cliente é usado.
 */
export function clientFromRequest(req: FastifyRequest) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Sem token de autenticação.");
  return supabaseForUser(token);
}
