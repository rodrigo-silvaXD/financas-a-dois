import { supabase } from "./supabase";
import { todayISO } from "./format";

export type Recurring = {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  categoria_id: string | null;
  dia_do_mes: number;
  ativo: boolean;
  created_at: string;
};

export async function listRecurring(userId: string): Promise<Recurring[]> {
  const { data } = await supabase.from("recurring_expenses").select("*")
    .eq("user_id", userId).order("dia_do_mes");
  return (data ?? []) as Recurring[];
}

export async function saveRecurring(userId: string, r: {
  id?: string; nome: string; valor: number; categoria_id: string | null; dia_do_mes: number; ativo: boolean;
}) {
  if (r.id) {
    const { error } = await supabase.from("recurring_expenses")
      .update({ nome: r.nome, valor: r.valor, categoria_id: r.categoria_id, dia_do_mes: r.dia_do_mes, ativo: r.ativo })
      .eq("id", r.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("recurring_expenses").insert({
      user_id: userId, ...r,
    });
    if (error) throw new Error(error.message);
  }
}

export async function deleteRecurring(id: string) {
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Lança as recorrentes ativas do usuário que ainda não foram lançadas neste mês
 * e cujo dia_do_mes já passou (ou é hoje). Chamado no load do Dashboard.
 * ponytail: sem cron. Client-side, idempotente por (user_id, recorrente_id, mês).
 */
export async function ensureRecurringForCurrentMonth(userId: string): Promise<number> {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: recs }, { data: jaFeitas }] = await Promise.all([
    supabase.from("recurring_expenses").select("*")
      .eq("user_id", userId).eq("ativo", true).lte("dia_do_mes", dia),
    supabase.from("transactions").select("recorrente_id")
      .eq("user_id", userId).gte("data", mesInicio).not("recorrente_id", "is", null),
  ]);

  const done = new Set<string>((jaFeitas ?? []).map((r) => r.recorrente_id as string));
  const toInsert = (recs ?? []).filter((r) => !done.has(r.id));
  if (toInsert.length === 0) return 0;

  const dataLanc = todayISO();
  const rows = toInsert.map((r) => ({
    user_id: userId,
    tipo: "gasto",
    valor: r.valor,
    categoria_id: r.categoria_id,
    descricao: r.nome,
    data: dataLanc,
    origem: "recorrente",
    recorrente_id: r.id,
    recorrente: true,
  }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
