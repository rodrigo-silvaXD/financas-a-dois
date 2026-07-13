import { supabase } from "./supabase";
import { normalize } from "./normalize";
import type { TransactionDraft } from "@/components/TransactionForm";

// Some browsers têm crypto.randomUUID(); fallback simples se não.
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Retorna YYYY-MM-DD do mês seguinte, preservando o dia (com clamp pro último dia do mês). */
function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Salva transação (ou N transações se draft.parcelas > 1) e aprende pattern se veio de IA.
 * ponytail: mesmo insert. Se parcelado, envia N linhas de uma vez com parcelamento_id compartilhado.
 */
export async function saveTransaction(userId: string, draft: TransactionDraft) {
  const parcelas = draft.parcelas && draft.parcelas > 1 ? draft.parcelas : 1;
  const parcelamentoId = parcelas > 1 ? uuid() : null;

  const rows = Array.from({ length: parcelas }, (_, i) => ({
    user_id: userId,
    tipo: draft.tipo,
    valor: draft.valor,             // valor de cada parcela, não do total
    categoria_id: draft.categoria_id,
    descricao: draft.descricao,
    data: parcelas > 1 ? addMonths(draft.data, i) : draft.data,
    origem: draft.origem,
    parcelamento_id: parcelamentoId,
    parcela_atual: parcelas > 1 ? i + 1 : null,
    parcela_total: parcelas > 1 ? parcelas : null,
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;

  // Aprendizado de category_rules — só quando IA sugeriu.
  const ehIA = draft.origem === "ia_texto" || draft.origem === "ia_foto";
  if (ehIA && draft.descricao && draft.categoria_id) {
    const pattern = normalize(draft.descricao);
    if (pattern) {
      const { data: existing } = await supabase
        .from("category_rules")
        .select("id, vezes_usado")
        .eq("user_id", userId).eq("pattern", pattern)
        .maybeSingle();
      if (existing) {
        await supabase.from("category_rules")
          .update({ vezes_usado: existing.vezes_usado + 1, category_id: draft.categoria_id })
          .eq("id", existing.id);
      } else {
        await supabase.from("category_rules").insert({
          user_id: userId, pattern, category_id: draft.categoria_id,
        });
      }
    }
  }
}

/**
 * Retorna resumo dos parcelamentos ainda em andamento do usuário.
 * "Em andamento" = existe alguma parcela com data futura (a partir de hoje).
 */
export type ParcelamentoAtivo = {
  parcelamento_id: string;
  descricao: string | null;
  valor: number;              // valor por parcela
  parcela_total: number;
  parcelas_pagas: number;     // já com data <= hoje
};

export async function listParcelamentosAtivos(userId: string): Promise<ParcelamentoAtivo[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("transactions")
    .select("parcelamento_id, descricao, valor, parcela_atual, parcela_total, data")
    .eq("user_id", userId)
    .not("parcelamento_id", "is", null);

  const groups = new Map<string, ParcelamentoAtivo & { hasFuture: boolean }>();
  for (const t of (data ?? []) as {
    parcelamento_id: string; descricao: string | null; valor: number;
    parcela_atual: number; parcela_total: number; data: string;
  }[]) {
    const g = groups.get(t.parcelamento_id) ?? {
      parcelamento_id: t.parcelamento_id, descricao: t.descricao, valor: Number(t.valor),
      parcela_total: t.parcela_total, parcelas_pagas: 0, hasFuture: false,
    };
    if (t.data <= hoje) g.parcelas_pagas += 1;
    if (t.data > hoje)  g.hasFuture = true;
    groups.set(t.parcelamento_id, g);
  }
  return Array.from(groups.values())
    .filter((g) => g.hasFuture)
    .map(({ hasFuture: _, ...rest }) => rest);   // eslint-disable-line @typescript-eslint/no-unused-vars
}
