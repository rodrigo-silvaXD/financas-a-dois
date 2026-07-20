import { supabase } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Fetch autenticado ao backend Fastify. Envia o access_token do Supabase.
 * - Força refresh se o token estiver expirado (evita 401 no backend).
 * - Content-Type: application/json só quando há body.
 * - Broadcast de erro para o Toast global.
 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  // getSession() do supabase-js já refresca se estiver expirando; força fallback via refreshSession se veio null.
  let { data } = await supabase.auth.getSession();
  if (!data.session) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    data = refreshed?.data ?? data;
  }
  const token = data.session?.access_token;

  const hasBody = init.body != null;
  const headers: Record<string, string> = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    const err = new ApiError(msg || `HTTP ${res.status}`, res.status);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-error", { detail: err.message }));
    }
    throw err;
  }
  // 204 / vazio — evita "Unexpected end of JSON input" em callers que não usam o retorno.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
