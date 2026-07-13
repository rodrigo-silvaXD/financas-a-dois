import { supabase } from "./supabase";

export type Metricas = {
  entradas: number;
  gastos: number;
  economia: number;
  economiaAnterior: number;
  variacaoEconomia: number;    // % vs mês anterior
  maiorGasto: { descricao: string; valor: number; categoria: string | null } | null;
  mediaDiariaGastos: number;
  diaSemanaMaisGastos: string | null;
  variacaoPorCategoria: { categoria: string; atual: number; anterior: number; delta_pct: number }[];
};

const diaSemLabel = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Métricas de um mês YYYY-MM. Compara com o mês anterior. */
export async function calcularMetricas(userId: string, ym: string): Promise<Metricas> {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const iniAtual = `${ym}-01`;
  const fimAtual = new Date(y, m, 1).toISOString().slice(0, 10);
  const iniAnterior = new Date(y, m - 2, 1).toISOString().slice(0, 10);

  const { data } = await supabase.from("transactions")
    .select("tipo, valor, data, descricao, categoria:categories(nome)")
    .eq("user_id", userId)
    .gte("data", iniAnterior).lt("data", fimAtual);

  type R = { tipo: "gasto" | "entrada"; valor: number; data: string; descricao: string | null; categoria: { nome: string } | null };
  const rows = (data ?? []) as unknown as R[];
  const atuais    = rows.filter((r) => r.data >= iniAtual);
  const anteriores = rows.filter((r) => r.data <  iniAtual);

  const somar = (rs: R[], tipo: R["tipo"]) => rs.filter((r) => r.tipo === tipo).reduce((s, r) => s + Number(r.valor), 0);
  const entradas = somar(atuais, "entrada");
  const gastos = somar(atuais, "gasto");
  const economia = entradas - gastos;
  const economiaAnterior = somar(anteriores, "entrada") - somar(anteriores, "gasto");
  const variacaoEconomia = economiaAnterior !== 0
    ? ((economia - economiaAnterior) / Math.abs(economiaAnterior)) * 100
    : 0;

  const gastosAtuais = atuais.filter((r) => r.tipo === "gasto");
  const maiorGasto = gastosAtuais.reduce<R | null>(
    (top, r) => (!top || Number(r.valor) > Number(top.valor) ? r : top), null);

  const diasNoMes = Math.max(1, new Date(y, m, 0).getDate());
  const mediaDiariaGastos = gastos / diasNoMes;

  // Dia da semana com mais gastos
  const perDia: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const r of gastosAtuais) {
    const d = new Date(r.data + "T12:00:00").getDay();
    perDia[d] = (perDia[d] ?? 0) + Number(r.valor);
  }
  let idxMax = -1, maxVal = 0;
  perDia.forEach((v, i) => { if (v > maxVal) { maxVal = v; idxMax = i; } });
  const diaSemanaMaisGastos = idxMax >= 0 ? (diaSemLabel[idxMax] ?? null) : null;

  // Variação por categoria (top 6 do mês atual)
  const porCatAtual = agrupaCat(gastosAtuais);
  const porCatAnterior = agrupaCat(anteriores.filter((r) => r.tipo === "gasto"));
  const variacaoPorCategoria = Array.from(porCatAtual.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([nome, valorAtual]) => {
      const anteriorVal = porCatAnterior.get(nome) ?? 0;
      const delta_pct = anteriorVal > 0 ? ((valorAtual - anteriorVal) / anteriorVal) * 100
                      : valorAtual > 0 ? 100 : 0;
      return { categoria: nome, atual: valorAtual, anterior: anteriorVal, delta_pct };
    });

  return {
    entradas, gastos, economia, economiaAnterior, variacaoEconomia,
    maiorGasto: maiorGasto
      ? { descricao: maiorGasto.descricao ?? maiorGasto.categoria?.nome ?? "—",
          valor: Number(maiorGasto.valor),
          categoria: maiorGasto.categoria?.nome ?? null }
      : null,
    mediaDiariaGastos,
    diaSemanaMaisGastos,
    variacaoPorCategoria,
  };
}

function agrupaCat(rs: { valor: number; categoria: { nome: string } | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rs) {
    const k = r.categoria?.nome ?? "Sem categoria";
    m.set(k, (m.get(k) ?? 0) + Number(r.valor));
  }
  return m;
}
