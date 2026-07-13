import { supabase } from "./supabase";
import { normalize } from "./normalize";
import type { TransactionDraft } from "@/components/TransactionForm";

/** Salva uma transação do usuário logado + aprende pattern se veio de IA. */
export async function saveTransaction(userId: string, draft: TransactionDraft) {
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    tipo: draft.tipo,
    valor: draft.valor,
    categoria_id: draft.categoria_id,
    descricao: draft.descricao,
    data: draft.data,
    origem: draft.origem,
  });
  if (error) throw error;

  // Aprendizado: se veio de IA e há descrição + categoria, upsert em category_rules.
  const ehIA = draft.origem === "ia_texto" || draft.origem === "ia_foto";
  if (ehIA && draft.descricao && draft.categoria_id) {
    const pattern = normalize(draft.descricao);
    if (pattern) {
      // Tenta bump; se não existir, insere.
      const { data: existing } = await supabase
        .from("category_rules")
        .select("id, vezes_usado")
        .eq("user_id", userId)
        .eq("pattern", pattern)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("category_rules")
          .update({ vezes_usado: existing.vezes_usado + 1, category_id: draft.categoria_id })
          .eq("id", existing.id);
      } else {
        await supabase.from("category_rules").insert({
          user_id: userId,
          pattern,
          category_id: draft.categoria_id,
        });
      }
    }
  }
}
