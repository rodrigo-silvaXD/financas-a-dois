import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

/** Cliente com service role — bypass de RLS. Só para jobs/admin. */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** Cliente com anon key + token do usuário — respeita RLS. */
export function supabaseForUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
