import { supabase } from "./supabase";

export type Periodo = 3 | 6 | 12;    // meses

/** YYYY-MM do início do período (N meses atrás, inclusive). */
function inicioPeriodo(meses: Periodo): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (meses - 1));
  return d.toISOString().slice(0, 10);
}

export async function fetchTxForCharts(userId: string, periodo: Periodo) {
  const desde = inicioPeriodo(periodo);
  const { data } = await supabase.from("transactions")
    .select("tipo, valor, data, categoria:categories(nome, cor)")
    .eq("user_id", userId)
    .gte("data", desde);
  return (data ?? []) as unknown as {
    tipo: "gasto" | "entrada";
    valor: number;
    data: string;
    categoria: { nome: string; cor: string | null } | null;
  }[];
}

/** Chave YYYY-MM. */
export function mesKey(iso: string): string { return iso.slice(0, 7); }

/** Últimos N meses como labels ("jul/26"). */
export function ultimosMesesLabels(periodo: Periodo): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = periodo - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = dd.toISOString().slice(0, 7);
    const label = dd.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/");
    out.push({ key, label });
  }
  return out;
}
