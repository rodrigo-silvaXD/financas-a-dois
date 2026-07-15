"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, PiggyBank, RefreshCw, Sparkles, Target, Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { formatBRL, formatDateShort } from "@/lib/format";
import { Card, EmptyState, ProgressBar, TopBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CategoryAvatar } from "@/components/CategoryIcon";
import { GoalCard } from "@/components/GoalCard";
import { DrillDownSheet, type DrillType } from "@/components/DrillDownSheet";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { OriginBadge } from "@/components/OriginBadge";
import { SkeletonCard, SkeletonRow, useMinLoading } from "@/components/Skeleton";
import { staggerContainer, staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { listGoals, type Goal } from "@/lib/goals";
import { ensureRecurringForCurrentMonth } from "@/lib/recurring";
import { listParcelamentosAtivos, type ParcelamentoAtivo } from "@/lib/transactions";
import type { Category, Profile, TransactionRow } from "@/lib/types";

type Row = TransactionRow & { categoria: Pick<Category, "nome" | "icone" | "cor"> | null };

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [parcelas, setParcelas] = useState<ParcelamentoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState<DrillType | null>(null);
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;

    // Lança recorrentes pendentes do mês antes de ler as transações. Idempotente.
    try {
      const n = await ensureRecurringForCurrentMonth(user.id);
      if (n > 0) toast.success(`${n} recorrente${n > 1 ? "s" : ""} lançada${n > 1 ? "s" : ""}`);
    } catch { /* silencioso — não bloqueia dashboard */ }

    const monthStart = new Date(); monthStart.setDate(1);
    const iso = monthStart.toISOString().slice(0, 10);

    const [{ data: prof }, { data: tx }, { data: c }, gs, ps] = await Promise.all([
      supabase.from("profiles").select("id, nome, avatar_url").eq("id", user.id).single(),
      supabase.from("transactions")
        .select("*, categoria:categories(nome, icone, cor)")
        .gte("data", iso)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true),
      listGoals(user.id),
      listParcelamentosAtivos(user.id),
    ]);
    setProfile(prof as Profile | null);
    setRows((tx ?? []) as Row[]);
    setCats((c ?? []) as Category[]);
    setGoals(gs);
    setParcelas(ps);
    setLoading(false);
    setRefreshing(false);
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const gastos   = rows.filter((r) => r.tipo === "gasto"  ).reduce((s, r) => s + Number(r.valor), 0);
  const saldo    = entradas - gastos;
  const pctGasto = entradas > 0 ? Math.min(100, (gastos / entradas) * 100) : 0;

  const ultimos = rows.slice(0, 5);
  const topGoals = goals.slice(0, 3);

  const gastoPorCat = new Map<string, number>();
  for (const r of rows.filter((x) => x.tipo === "gasto" && x.categoria_id)) {
    gastoPorCat.set(r.categoria_id!, (gastoPorCat.get(r.categoria_id!) ?? 0) + Number(r.valor));
  }
  const alertasLimite = cats
    .filter((c) => c.limite_mensal && c.limite_mensal > 0)
    .map((c) => {
      const gasto = gastoPorCat.get(c.id) ?? 0;
      const pct = (gasto / Number(c.limite_mensal)) * 100;
      return { c, gasto, pct };
    })
    .filter((a) => a.pct >= 85)
    .sort((a, b) => b.pct - a.pct);

  return (
    <main>
      <TopBar
        title=""
        rightSlot={
          <>
            <Link href="/estatisticas" aria-label="Estatísticas"
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <Sparkles size={20} />
            </Link>
            <Link href="/graficos" aria-label="Gráficos"
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <BarChart3 size={20} />
            </Link>
            <button onClick={() => { setRefreshing(true); load(); }} aria-label="Atualizar"
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

      <section className="mx-auto max-w-md px-5 pt-4 space-y-8">
        <div>
          <p className="text-body text-ink-muted">
            Olá, <span className="text-ink font-semibold">{profile?.nome ?? "…"}</span> 👋
          </p>
        </div>

        {showSkeleton ? (
          <>
            <SkeletonCard />
            <div className="grid grid-cols-3 gap-4">
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
            </div>
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </>
        ) : (
          <>
            {/* Saldo do mês — número animado */}
            <Card className="p-6">
              <span className="text-caption text-ink-subtle uppercase tracking-wide font-medium">Saldo do mês</span>
              <div className="mt-2">
                <AnimatedBRL value={saldo}
                  className={cn("block text-display", saldo >= 0 ? "text-ink" : "text-danger")} />
              </div>
              <div className="mt-6">
                <ProgressBar value={pctGasto} tone={pctGasto > 80 ? "warning" : "brand"}
                  label={entradas > 0 ? `Você já gastou ${Math.round(pctGasto)}% do que entrou` : "Sem entradas este mês"} />
              </div>
            </Card>

            {/* 3 mini-cards com stagger — clicáveis pra drill-down */}
            <motion.div className="grid grid-cols-3 gap-4"
              variants={staggerContainer} initial="initial" animate="animate">
              <motion.div variants={fadeUpItem}>
                <MiniCard icon={<ArrowUpRight size={16} />} tone="success" label="Entrou" valor={entradas}
                  onClick={() => setDrill("entrada")} />
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <MiniCard icon={<ArrowDownRight size={16} />} tone="danger" label="Saiu" valor={gastos}
                  onClick={() => setDrill("gasto")} />
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <MiniCard icon={<PiggyBank size={16} />} tone="brand" label="Economia" valor={Math.max(0, saldo)}
                  onClick={() => setDrill("economia")} />
              </motion.div>
            </motion.div>

            {/* Alertas de limite */}
            {alertasLimite.length > 0 && (
              <motion.div className="space-y-3" variants={staggerContainerFast} initial="initial" animate="animate">
                {alertasLimite.map(({ c, gasto, pct }) => {
                  const tone = pct >= 100 ? "danger" : "warning";
                  return (
                    <motion.div key={c.id} variants={fadeUpItem}>
                      <Card className={cn("flex items-start gap-3 p-4",
                        tone === "danger" ? "border-danger/40" : "border-warning/40")}>
                        <AlertTriangle size={18} className={cn("mt-0.5",
                          tone === "danger" ? "text-danger" : "text-warning")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-body text-ink leading-relaxed">
                            Você já usou <span className="font-semibold">{Math.round(pct)}%</span> do limite de <span className="font-semibold">{formatBRL(Number(c.limite_mensal))}</span> em {c.nome}.
                          </p>
                          <p className="text-caption text-ink-subtle mt-1">Gastou {formatBRL(gasto)} este mês.</p>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Meus Objetivos */}
            {topGoals.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-heading text-ink-muted font-semibold">Meus Objetivos</h2>
                  <Link href="/objetivos" className="text-bodysm text-brand font-semibold">Ver todos</Link>
                </div>
                <motion.div className="space-y-3"
                  variants={staggerContainerFast} initial="initial" animate="animate">
                  {topGoals.map((g) => (
                    <motion.div key={g.id} variants={fadeUpItem}>
                      <Link href="/objetivos"><GoalCard goal={g} /></Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ) : (
              <Link href="/objetivos">
                <Card interactive className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-brand/10 p-3 text-brand"><Target size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink font-medium">Crie um objetivo</p>
                    <p className="text-caption text-ink-subtle mt-0.5">Casa, viagem, casamento…</p>
                  </div>
                </Card>
              </Link>
            )}

            {/* Parcelamentos ativos */}
            {parcelas.length > 0 && (
              <div>
                <h2 className="mb-4 text-heading text-ink-muted font-semibold">Parcelamentos ativos</h2>
                <motion.ul className="space-y-3"
                  variants={staggerContainerFast} initial="initial" animate="animate">
                  {parcelas.map((p) => (
                    <motion.li key={p.parcelamento_id} variants={fadeUpItem}>
                      <Card className="flex items-center gap-3 p-4">
                        <div className="rounded-xl bg-surface-muted p-2.5 text-ink-muted"><Wallet size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body text-ink">{p.descricao ?? "Compra parcelada"}</p>
                          <p className="text-caption text-ink-subtle mt-0.5">
                            {p.parcelas_pagas}/{p.parcela_total} · {formatBRL(p.valor)}/parcela
                          </p>
                        </div>
                      </Card>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            )}

            {/* Últimos lançamentos */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-heading text-ink-muted font-semibold">Últimos lançamentos</h2>
                <Link href="/extrato" className="text-bodysm text-brand font-semibold">Ver todos</Link>
              </div>
              {ultimos.length === 0 ? (
                <EmptyState icon={Wallet} title="Nenhum lançamento este mês"
                  description="Toque no + pra registrar seu primeiro gasto ou entrada." />
              ) : (
                <motion.ul className="space-y-3"
                  variants={staggerContainerFast} initial="initial" animate="animate">
                  {ultimos.map((r) => (
                    <motion.li key={r.id} variants={fadeUpItem}>
                      <TransactionRowItem row={r} />
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </>
        )}
      </section>

      {user && (
        <DrillDownSheet
          open={drill !== null}
          onClose={() => setDrill(null)}
          type={drill ?? "gasto"}
          userId={user.id}
        />
      )}
    </main>
  );
}

function MiniCard({ icon, tone, label, valor, onClick }: {
  icon: React.ReactNode; tone: "success" | "danger" | "brand"; label: string; valor: number; onClick?: () => void;
}) {
  // Fundos tintados bem sutis — verde/vermelho/azul distinguíveis nos 2 temas.
  const tones = {
    success: { text: "text-success", card: "bg-success/[0.07] border-success/20" },
    danger:  { text: "text-danger",  card: "bg-danger/[0.07] border-danger/20" },
    brand:   { text: "text-brand",   card: "bg-brand/[0.07] border-brand/20" },
  }[tone];
  return (
    <Card interactive={!!onClick} onClick={onClick} className={cn("p-4", tones.card)}>
      <div className={cn("flex items-center gap-1.5 text-caption font-medium", tones.text)}>{icon}<span>{label}</span></div>
      <AnimatedBRL value={valor}
        className="mt-2 block text-bodysm font-bold text-ink truncate" />
    </Card>
  );
}

function TransactionRowItem({ row }: { row: Row }) {
  const isEntry = row.tipo === "entrada";
  return (
    <Card className="flex items-center gap-3 p-4">
      <CategoryAvatar categoria={row.categoria} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-ink font-medium">{row.descricao || row.categoria?.nome || "Sem descrição"}</p>
        <p className="text-caption text-ink-subtle mt-0.5">{formatDateShort(row.data)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-body font-semibold ${isEntry ? "text-success" : "text-danger"}`}>
          {isEntry ? "+" : "−"} {formatBRL(Number(row.valor))}
        </span>
        {(row.origem !== "manual" || (row.parcela_total && row.parcela_atual)) && (
          <OriginBadge origem={row.origem}
            parcela={row.parcela_total && row.parcela_atual
              ? { atual: row.parcela_atual, total: row.parcela_total } : null} />
        )}
      </div>
    </Card>
  );
}
