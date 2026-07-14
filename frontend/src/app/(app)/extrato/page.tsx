"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, Trash2, Wallet, X } from "lucide-react";
import { SkeletonRow } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Badge, BottomSheet, Button, Card, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL, formatDateFull, parseBRL } from "@/lib/format";
import { normalize } from "@/lib/normalize";
import { cn } from "@/lib/cn";
import type { Category, TransactionRow } from "@/lib/types";

type Row = TransactionRow & { categoria: Pick<Category, "nome" | "icone" | "cor"> | null };
type Filtro = "hoje" | "semana" | "mes" | "ano" | "tudo";
type Tipo = "gasto" | "entrada" | "ambos";
type Origem = TransactionRow["origem"] | "todas";

const filtros: { id: Filtro; label: string }[] = [
  { id: "hoje", label: "Hoje" }, { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" }, { id: "ano", label: "Ano" }, { id: "tudo", label: "Todos" },
];

function inicioDoPeriodo(f: Filtro): string | null {
  const d = new Date();
  if (f === "semana") d.setDate(d.getDate() - 7);
  else if (f === "mes") d.setDate(1);
  else if (f === "ano") { d.setMonth(0); d.setDate(1); }
  else if (f === "tudo") return null;
  return d.toISOString().slice(0, 10);
}

type Advanced = {
  q: string;
  categoryIds: Set<string>;
  tipo: Tipo;
  minStr: string;
  maxStr: string;
  origem: Origem;
};

const emptyAdvanced: Advanced = {
  q: "", categoryIds: new Set(), tipo: "ambos", minStr: "", maxStr: "", origem: "todas",
};

export default function ExtratoPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [adv, setAdv] = useState<Advanced>(emptyAdvanced);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("transactions")
      .select("*, categoria:categories(nome, icone, cor)")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);
    const desde = inicioDoPeriodo(filtro);
    if (desde) q = q.gte("data", desde);
    const [{ data: tx }, { data: c }] = await Promise.all([
      q,
      supabase.from("categories").select("*").eq("user_id", user.id).order("ordem"),
    ]);
    setRows((tx ?? []) as Row[]);
    setCats((c ?? []) as Category[]);
    setLoading(false);
  }, [user, filtro]);

  useEffect(() => { load(); }, [load]);

  // Filtros avançados aplicados client-side sobre rows.
  const filtered = useMemo(() => {
    const nq = normalize(adv.q);
    const min = parseBRL(adv.minStr);
    const max = parseBRL(adv.maxStr);
    return rows.filter((r) => {
      if (adv.tipo !== "ambos" && r.tipo !== adv.tipo) return false;
      if (adv.origem !== "todas" && r.origem !== adv.origem) return false;
      if (adv.categoryIds.size > 0) {
        if (!r.categoria_id || !adv.categoryIds.has(r.categoria_id)) return false;
      }
      if (min > 0 && Number(r.valor) < min) return false;
      if (max > 0 && Number(r.valor) > max) return false;
      if (nq) {
        const hay = normalize((r.descricao ?? "") + " " + (r.categoria?.nome ?? ""));
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [rows, adv]);

  const grupos = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of filtered) {
      const arr = m.get(r.data) ?? [];
      arr.push(r); m.set(r.data, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  const activeAdvCount =
    (adv.q ? 1 : 0) + (adv.categoryIds.size > 0 ? 1 : 0) +
    (adv.tipo !== "ambos" ? 1 : 0) +
    (adv.origem !== "todas" ? 1 : 0) +
    (adv.minStr || adv.maxStr ? 1 : 0);

  return (
    <main>
      <TopBar title="Extrato" rightSlot={
        <button onClick={() => setSheetOpen(true)} aria-label="Filtros"
          className="relative rounded-md p-1.5 text-ink-muted hover:text-ink transition-colors duration-base ease-apple">
          <Filter size={20} />
          {activeAdvCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-pill bg-brand text-brand-ink text-[10px] font-bold px-1">
              {activeAdvCount}
            </span>
          )}
        </button>
      } />

      <section className="mx-auto max-w-md px-5 pt-4">
        {/* Chips de período */}
        <div className="flex gap-2 overflow-x-auto pb-3">
          {filtros.map((f) => {
            const active = f.id === filtro;
            return (
              <motion.button key={f.id} onClick={() => setFiltro(f.id)}
                whileTap={{ scale: 0.94 }}
                animate={active ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className={cn("shrink-0 rounded-full px-4 py-2 text-bodysm font-medium transition-colors duration-base ease-apple",
                  active ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted hover:text-ink")}>
                {f.label}
              </motion.button>
            );
          })}
        </div>

        {/* Barra de busca compacta sempre visível */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input value={adv.q} onChange={(e) => setAdv({ ...adv, q: e.target.value })}
            placeholder="Buscar descrição ou categoria…"
            className="h-12 w-full rounded-lg bg-surface-muted pl-10 pr-10 text-body text-ink placeholder:text-ink-subtle outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple" />
          {adv.q && (
            <button onClick={() => setAdv({ ...adv, q: "" })} aria-label="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-subtle hover:text-ink">
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="Nada encontrado" description="Ajuste os filtros ou o período." />
        ) : (
          <div className="space-y-8 pb-2">
            {grupos.map(([data, itens]) => {
              const totalDia = itens.reduce((s, r) => s + (r.tipo === "entrada" ? 1 : -1) * Number(r.valor), 0);
              return (
                <div key={data}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="text-bodysm text-ink-muted font-medium">{formatDateFull(data)}</h3>
                    <span className={cn("text-caption font-semibold", totalDia >= 0 ? "text-success" : "text-danger")}>
                      {totalDia >= 0 ? "+" : "−"} {formatBRL(Math.abs(totalDia))}
                    </span>
                  </div>
                  <motion.ul className="space-y-3"
                    variants={staggerContainerFast} initial="initial" animate="animate">
                    <AnimatePresence>
                      {itens.map((r) => (
                        <motion.li key={r.id} variants={fadeUpItem} layout
                          exit={{ opacity: 0, x: -40, transition: { duration: 0.22, ease: "linear" } }}>
                          <Card className="flex items-center gap-3 p-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-ink-muted shrink-0"
                              style={r.categoria?.cor ? { background: r.categoria.cor } : undefined}>
                              {r.categoria?.icone
                                ? <CategoryIcon name={r.categoria.icone} size={18} strokeWidth={1.75} />
                                : <Wallet size={18} strokeWidth={1.75} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-body text-ink font-medium">{r.descricao || r.categoria?.nome || "Sem descrição"}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <span className="text-caption text-ink-subtle">{r.categoria?.nome ?? "—"}</span>
                                {(r.origem === "ia_texto" || r.origem === "ia_foto") && <Badge tone="brand">✨ IA</Badge>}
                                {r.parcela_total && r.parcela_atual && (
                                  <Badge tone="neutral">Parcela {r.parcela_atual}/{r.parcela_total}</Badge>
                                )}
                                {r.origem === "recorrente" && <Badge tone="neutral">Recorrente</Badge>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn("block text-body font-semibold",
                                r.tipo === "entrada" ? "text-success" : "text-danger")}>
                                {r.tipo === "entrada" ? "+" : "−"} {formatBRL(Number(r.valor))}
                              </span>
                              <button onClick={() => excluir(r.id)} disabled={deletingId === r.id}
                                aria-label="Excluir"
                                className="mt-1.5 rounded-lg p-1.5 text-ink-subtle hover:text-danger transition-colors duration-base ease-apple disabled:opacity-40">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </Card>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filtros">
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <span className="text-bodysm text-ink-muted font-medium">Tipo</span>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-surface-muted p-1">
              {(["ambos", "gasto", "entrada"] as Tipo[]).map((t) => (
                <button key={t} onClick={() => setAdv({ ...adv, tipo: t })}
                  className={cn("h-10 rounded-md text-bodysm font-medium capitalize transition-colors duration-base ease-apple",
                    adv.tipo === t ? "bg-surface text-ink shadow-sm" : "text-ink-muted")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Origem */}
          <div>
            <span className="text-bodysm text-ink-muted font-medium">Origem</span>
            <div className="mt-2 flex gap-2 flex-wrap">
              {(["todas", "manual", "ia_texto", "ia_foto", "importado", "recorrente"] as Origem[]).map((o) => (
                <button key={o} onClick={() => setAdv({ ...adv, origem: o })}
                  className={cn("rounded-pill px-3 py-1.5 text-caption transition-colors duration-base ease-apple",
                    adv.origem === o ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted")}>
                  {o.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Categorias — multi-select */}
          <div>
            <span className="text-bodysm text-ink-muted font-medium">Categorias</span>
            <div className="mt-2 flex gap-2 flex-wrap max-h-40 overflow-y-auto pr-1">
              {cats.map((c) => {
                const active = adv.categoryIds.has(c.id);
                return (
                  <button key={c.id} onClick={() => {
                    const next = new Set(adv.categoryIds);
                    if (active) next.delete(c.id); else next.add(c.id);
                    setAdv({ ...adv, categoryIds: next });
                  }}
                    className={cn("rounded-pill px-3 py-1.5 text-caption flex items-center gap-1 transition-colors duration-base ease-apple",
                      active ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted")}>
                    <CategoryIcon name={c.icone} size={12} />
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Range de valor */}
          <div className="grid grid-cols-2 gap-3">
            <Input name="min" label="Valor mín. (R$)" placeholder="0,00" inputMode="decimal"
              value={adv.minStr} onChange={(e) => setAdv({ ...adv, minStr: e.target.value })} />
            <Input name="max" label="Valor máx. (R$)" placeholder="0,00" inputMode="decimal"
              value={adv.maxStr} onChange={(e) => setAdv({ ...adv, maxStr: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setAdv(emptyAdvanced)}>
              Limpar
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setSheetOpen(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}
