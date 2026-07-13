import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. Copie .env.example → .env.local.",
  );
}

// SDK padrão do Supabase já persiste no localStorage e faz refresh automático.
export const supabase: SupabaseClient = createClient(url, anon);
