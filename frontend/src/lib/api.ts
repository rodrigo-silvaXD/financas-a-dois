import { supabase } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/**
 * Fetch autenticado ao backend Fastify. Envia o access_token do Supabase.
 * ponytail: minúsculo. Sem retry/refresh — supabase-js refresca sozinho e a próxima call pega o token novo.
 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    const err = new Error(msg || `HTTP ${res.status}`);
    // Broadcast: mesmo se o chamador não tratar, ToastProvider mostra.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-error", { detail: err.message }));
    }
    throw err;
  }
  return res.json() as Promise<T>;
}
