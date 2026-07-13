"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Badge, Card, EmptyState, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL, formatDateFull } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Category, TransactionRow } from "@/lib/types";

type Row = TransactionRow & { categoria: Pick<Category, "nome" | "icone" | "cor"> | null };
type Filtro = "hoje" | "semana" | "mes" | "ano" | "tudo";

const filtros: { id: Filtro; label: string }[] = [
  { id: "hoje",   label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mês" },
  { id: "ano",    label: "Ano" },
  { id: "tudo",   label: "Todos" },
];

function inicioDoPeriodo(f: Filtro): string | null {
  const d = new Date();
  if (f === "hoje")   { /* mesmo dia */ }
  else if (f === "semana") d.setDate(d.getDate() - 7);
  else if (f === "mes")    d.setDate(1);
  else if (f === "ano")    { d.setMonth(0); d.setDate(1); }
  else                     return null;
  return d.toISOString().slice(0, 10);
}

export default function ExtratoPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("transactions")
      .select("*, categoria:categories(nome, icone, cor)")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    const desde = inicioDoPeriodo(filtro);
    if (desde) q = q.gte("data", desde);
    const { data } = await q;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [user, filtro]);

  useEffect(() => { load(); }, [load]);

  const grupos = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = m.get(r.data) ?? [];
      arr.push(r); m.set(r.data, arr);
    }
    return Array.from(m.entries()); // já ordenado pelo select
  }, [rows]);

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  return (
    <main>
      <TopBar title="Extrato" />
      <section className="mx-auto max-w-md px-4 pt-2">
        {/* Chips de período */}
        <div className="flex gap-2 overflow-x-auto pb-3">
          {filtros.map((f) => {
            const active = f.id === filtro;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  "shrink-0 rounded-pill px-3 py-1.5 text-bodysm font-medium transition-colors duration-base ease-apple",
                  active ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted hover:text-ink",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <Card className="text-center text-ink-subtle">Carregando…</Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nada por aqui ainda"
            description="Quando você registrar lançamentos, eles aparecem organizados por dia."
          />
        ) : (
          <div className="space-y-5 pb-2">
            {grupos.map(([data, itens]) => {
              const totalDia = itens.reduce((s, r) => s + (r.tipo === "entrada" ? 1 : -1) * Number(r.valor), 0);
              return (
                <div key={data}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <h3 className="text-bodysm text-ink-muted">{formatDateFull(data)}</h3>
                    <span className={cn("text-caption font-semibold", totalDia >= 0 ? "text-success" : "text-danger")}>
                      {totalDia >= 0 ? "+" : "−"} {formatBRL(Math.abs(totalDia))}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {itens.map((r) => (
                      <motion.li key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <Card className="flex items-center gap-3 p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-ink-muted"
                            style={r.categoria?.cor ? { background: r.categoria.cor } : undefined}>
                            {r.categoria?.icone
                              ? <CategoryIcon name={r.categoria.icone} size={18} strokeWidth={1.75} />
                              : <Wallet size={18} strokeWidth={1.75} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body text-ink">
                              {r.descricao || r.categoria?.nome || "Sem descrição"}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-caption text-ink-subtle">{r.categoria?.nome ?? "—"}</span>
                              {(r.origem === "ia_texto" || r.origem === "ia_foto") && (
                                <Badge tone="brand">✨ IA</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn("block text-body font-semibold",
                              r.tipo === "entrada" ? "text-success" : "text-danger")}>
                              {r.tipo === "entrada" ? "+" : "−"} {formatBRL(Number(r.valor))}
                            </span>
                            <button
                              onClick={() => excluir(r.id)}
                              disabled={deletingId === r.id}
                              aria-label="Excluir"
                              className="mt-1 rounded-md p-1 text-ink-subtle hover:text-danger transition-colors duration-base ease-apple disabled:opacity-40"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </Card>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
