"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { BottomSheet, Card, EmptyState } from "@/components/ui";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { SkeletonRow } from "@/components/Skeleton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL, formatDateShort } from "@/lib/format";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type DrillType = "entrada" | "gasto" | "economia";
type Periodo = "hoje" | "semana" | "mes" | "ano";

interface Props {
  open: boolean;
  onClose: () => void;
  type: DrillType;
  userId: string;
}

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function inicioDoPeriodo(f: Periodo): string {
  const d = new Date();
  if (f === "semana") d.setDate(d.getDate() - 7);
  else if (f === "mes") d.setDate(1);
  else if (f === "ano") { d.setMonth(0); d.setDate(1); }
  return localISO(d);
}

type TxRow = {
  id: string; tipo: "gasto" | "entrada"; valor: number;
  descricao: string | null; data: string;
  categoria: { nome: string; icone: string; cor: string | null } | null;
};

const filtros: { v: Periodo; label: string }[] = [
  { v: "hoje", label: "Hoje" },
  { v: "semana", label: "Semana" },
  { v: "mes", label: "Mês" },
  { v: "ano", label: "Ano" },
];

const config = {
  entrada: { title: "Entradas", tipoFiltro: "entrada" as const, tone: "success" as const },
  gasto:   { title: "Gastos",   tipoFiltro: "gasto" as const,   tone: "danger" as const },
  economia:{ title: "Economia mensal", tipoFiltro: null,          tone: "brand" as const },
};

export function DrillDownSheet({ open, onClose, type, userId }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthly, setMonthly] = useState<{ mes: string; entradas: number; gastos: number; economia: number }[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const cfg = config[type];

    if (type === "economia") {
      // Últimos 6 meses vs atual
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
      seisMesesAtras.setDate(1);
      supabase.from("transactions")
        .select("tipo, valor, data")
        .eq("user_id", userId)
        .gte("data", localISO(seisMesesAtras))
        .then(({ data }) => {
          const map = new Map<string, { entradas: number; gastos: number }>();
          for (const t of (data ?? []) as { tipo: string; valor: number; data: string }[]) {
            const key = t.data.slice(0, 7);
            const b = map.get(key) ?? { entradas: 0, gastos: 0 };
            if (t.tipo === "entrada") b.entradas += Number(t.valor);
            else b.gastos += Number(t.valor);
            map.set(key, b);
          }
          const out = Array.from(map.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([mes, v]) => ({ mes, ...v, economia: v.entradas - v.gastos }));
          setMonthly(out);
          setLoading(false);
        });
    } else {
      const desde = inicioDoPeriodo(periodo);
      supabase.from("transactions")
        .select("id, tipo, valor, descricao, data, categoria:categories(nome, icone, cor)")
        .eq("user_id", userId).eq("tipo", cfg.tipoFiltro!).gte("data", desde)
        .order("data", { ascending: false })
        .then(({ data }) => {
          setRows((data ?? []) as unknown as TxRow[]);
          setLoading(false);
        });
    }
  }, [open, type, periodo, userId]);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.valor), 0), [rows]);

  // Agrupamento — gasto: por categoria; entrada: linhas cronológicas
  const grouped = useMemo(() => {
    if (type !== "gasto") return null;
    const m = new Map<string, TxRow[]>();
    for (const r of rows) {
      const k = r.categoria?.nome ?? "Sem categoria";
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.entries())
      .map(([nome, itens]) => ({ nome, total: itens.reduce((s, r) => s + Number(r.valor), 0), itens }))
      .sort((a, b) => b.total - a.total);
  }, [rows, type]);

  return (
    <BottomSheet open={open} onClose={onClose} title={config[type].title}>
      {type !== "economia" && (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {filtros.map((f) => {
              const active = periodo === f.v;
              return (
                <motion.button key={f.v} onClick={() => setPeriodo(f.v)}
                  whileTap={{ scale: 0.94 }}
                  animate={active ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className={cn("shrink-0 rounded-full px-4 py-2 text-bodysm font-medium transition-colors duration-base ease-apple",
                    active ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted")}>
                  {f.label}
                </motion.button>
              );
            })}
          </div>

          <Card className="mb-5 p-5">
            <p className="text-caption text-ink-subtle uppercase tracking-wide font-medium">Total no período</p>
            <AnimatedBRL value={total}
              className={cn("mt-2 block text-title font-bold",
                type === "entrada" ? "text-success" : "text-danger")} />
          </Card>
        </>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : type === "economia" ? (
        <motion.ul className="space-y-3"
          variants={staggerContainerFast} initial="initial" animate="animate">
          {monthly.length === 0 ? (
            <EmptyState title="Sem dados" description="Registre lançamentos para acompanhar." />
          ) : monthly.map((m) => (
            <motion.li key={m.mes} variants={fadeUpItem}>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-body text-ink font-medium">
                    {new Date(m.mes + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </p>
                  <span className={cn("text-body font-bold",
                    m.economia >= 0 ? "text-success" : "text-danger")}>
                    {m.economia >= 0 ? "+" : "−"} {formatBRL(Math.abs(m.economia))}
                  </span>
                </div>
                <div className="flex gap-4 text-caption text-ink-muted">
                  <span>Entrou: <span className="text-success">{formatBRL(m.entradas)}</span></span>
                  <span>Saiu: <span className="text-danger">{formatBRL(m.gastos)}</span></span>
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      ) : rows.length === 0 ? (
        <EmptyState title="Nada no período" description="Tente ajustar o filtro acima." />
      ) : type === "gasto" && grouped ? (
        <motion.ul className="space-y-3"
          variants={staggerContainerFast} initial="initial" animate="animate">
          {grouped.map((g) => (
            <motion.li key={g.nome} variants={fadeUpItem}>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-body text-ink font-semibold">{g.nome}</p>
                  <span className="text-body font-bold text-danger">{formatBRL(g.total)}</span>
                </div>
                <ul className="space-y-2 mt-3">
                  {g.itens.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-caption">
                      <span className="text-ink-muted truncate">{r.descricao || "Sem descrição"}</span>
                      <span className="text-ink-subtle shrink-0">{formatDateShort(r.data)}</span>
                    </li>
                  ))}
                  {g.itens.length > 3 && (
                    <li className="text-caption text-ink-subtle">+{g.itens.length - 3} mais</li>
                  )}
                </ul>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <motion.ul className="space-y-3"
          variants={staggerContainerFast} initial="initial" animate="animate">
          {rows.map((r) => (
            <motion.li key={r.id} variants={fadeUpItem}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-ink-muted shrink-0"
                  style={r.categoria?.cor ? { background: `${r.categoria.cor}22`, color: r.categoria.cor } : undefined}>
                  <CategoryIcon name={r.categoria?.icone ?? "wallet"} size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink font-medium">{r.descricao || r.categoria?.nome || "Sem descrição"}</p>
                  <p className="text-caption text-ink-subtle">{formatDateShort(r.data)}</p>
                </div>
                <span className="text-body font-semibold text-success">+ {formatBRL(Number(r.valor))}</span>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </BottomSheet>
  );
}
