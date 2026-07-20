"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Heart, MoreHorizontal,
  PiggyBank, RefreshCw, Sparkles, Target, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { formatBRL, formatDateShort, saudacao } from "@/lib/format";
import { BottomSheet, Card, EmptyState, ProgressBar, TopBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CategoryAvatar } from "@/components/CategoryIcon";
import { GoalCard } from "@/components/GoalCard";
import { DrillDownSheet, type DrillType } from "@/components/DrillDownSheet";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { OriginBadge } from "@/components/OriginBadge";
import { SkeletonCard, SkeletonRow, useMinLoading } from "@/components/Skeleton";
import { staggerContainer, staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { listGoals, type Goal } from "@/lib/goals";
import { getMyFamilyContext, type FamilyContext } from "@/lib/family";
import { ensureRecurringForCurrentMonth } from "@/lib/recurring";
import { listParcelamentosAtivos, type ParcelamentoAtivo } from "@/lib/transactions";
import type { Category, Profile, TransactionRow } from "@/lib/types";

type Row = TransactionRow & { categoria: Pick<Category, "nome" | "icone" | "cor"> | null };

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState<number | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [parcelas, setParcelas] = useState<ParcelamentoAtivo[]>([]);
  const [fam, setFam] = useState<FamilyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drill, setDrill] = useState<DrillType | null>(null);
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;

    // Lança recorrentes pendentes do mês antes de ler as transações. Idempotente.
    try {
      const n = await ensureRecurringForCurrentMonth(user.id);
      if (n > 0) toast.success(`${n} recorrente${n > 1 ? "s" : ""} lançada${n > 1 ? "s" : ""}`);
    } catch { /* silencioso — não bloqueia dashboard */ }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const iso     = monthStart.toISOString().slice(0, 10);
    const isoPrev = prevMonthStart.toISOString().slice(0, 10);

    const [{ data: prof }, { data: tx }, { data: txPrev }, { data: c }, gs, ps, ctx] = await Promise.all([
      supabase.from("profiles").select("id, nome, avatar_url").eq("id", user.id).single(),
      supabase.from("transactions")
        .select("*, categoria:categories(nome, icone, cor)")
        .gte("data", iso)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false }),
      // Mês anterior — só tipo/valor, o suficiente pra calcular saldo comparativo.
      supabase.from("transactions").select("tipo, valor")
        .gte("data", isoPrev).lt("data", iso),
      supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true),
      listGoals(user.id),
      listParcelamentosAtivos(user.id),
      getMyFamilyContext(user.id),
    ]);
    setProfile(prof as Profile | null);
    setRows((tx ?? []) as Row[]);
    const prev = (txPrev ?? []) as { tipo: "gasto" | "entrada"; valor: number }[];
    const sIn = prev.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
    const sOut = prev.filter((r) => r.tipo === "gasto").reduce((s, r) => s + Number(r.valor), 0);
    setSaldoAnterior(sIn - sOut);
    setCats((c ?? []) as Category[]);
    setGoals(gs);
    setParcelas(ps);
    setFam(ctx);
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
          <button onClick={() => setMenuOpen(true)} aria-label="Menu"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
            <MoreHorizontal size={22} />
          </button>
        }
      />

      <section className="mx-auto max-w-md px-5 pt-2 space-y-7">
        {/* ─── Saudação + nome (estilo Apple Wallet) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="pt-1"
        >
          <p className="text-body text-ink-muted">{saudacao()}</p>
          <h1 className="mt-1 text-greet text-ink truncate">{profile?.nome ?? "…"}</h1>
        </motion.div>

        {showSkeleton ? (
          <>
            <SkeletonCard className="h-44" />
            <div className="grid grid-cols-3 gap-3">
              <SkeletonCard className="h-28" />
              <SkeletonCard className="h-28" />
              <SkeletonCard className="h-28" />
            </div>
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </>
        ) : (
          <>
            {/* ─── HERO: saldo do mês (Apple Wallet style) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-eyebrow text-ink-subtle uppercase">Saldo do mês</span>
                  <SaldoTrend atual={saldo} anterior={saldoAnterior} />
                </div>
                <div className="mt-3">
                  <AnimatedBRL value={saldo}
                    className={cn("block text-hero tabular-nums",
                      saldo >= 0 ? "text-ink" : "text-danger")} />
                </div>
                <div className="mt-5">
                  <ProgressBar value={pctGasto} tone={pctGasto > 80 ? "warning" : "brand"}
                    label={entradas > 0 ? `${Math.round(pctGasto)}% do que entrou` : "Sem entradas este mês"} />
                </div>
              </Card>
            </motion.div>

            {/* ─── 3 mini-cards verticais com círculo de ícone (Apple Health) ─── */}
            <motion.div className="grid grid-cols-3 gap-3"
              variants={staggerContainer} initial="initial" animate="animate">
              <motion.div variants={fadeUpItem}>
                <StatTile icon={ArrowUpRight} tone="success" label="Entrou" valor={entradas}
                  onClick={() => setDrill("entrada")} />
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <StatTile icon={ArrowDownRight} tone="danger" label="Saiu" valor={gastos}
                  onClick={() => setDrill("gasto")} />
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <StatTile icon={PiggyBank} tone="brand" label="Economia" valor={Math.max(0, saldo)}
                  onClick={() => setDrill("economia")} />
              </motion.div>
            </motion.div>

            {/* Card resumo do Casal — só se tem família ativa */}
            {fam && (
              <Link href="/casal" className="block">
                <Card interactive className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Heart size={22} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-ink-subtle uppercase tracking-wide font-medium">Conta do casal</p>
                    <AnimatedBRL
                      value={Number(fam.coupleAccount.valor_atual)}
                      className={cn("block text-heading font-semibold mt-1",
                        Number(fam.coupleAccount.valor_atual) < 0 ? "text-danger" : "text-ink")}
                    />
                  </div>
                  {fam.partner && (
                    <div className="text-right shrink-0">
                      <p className="text-caption text-ink-subtle">com</p>
                      <p className="text-caption text-ink font-medium truncate max-w-[80px]">{fam.partner.nome}</p>
                    </div>
                  )}
                </Card>
              </Link>
            )}

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

      {/* Menu de ações do dashboard: estatísticas, gráficos, atualizar */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Ver mais">
        <div className="grid gap-3">
          <Link href="/estatisticas" onClick={() => setMenuOpen(false)}>
            <Card interactive className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink font-medium">Estatísticas</p>
                <p className="text-caption text-ink-subtle">Métricas do mês com IA</p>
              </div>
            </Card>
          </Link>
          <Link href="/graficos" onClick={() => setMenuOpen(false)}>
            <Card interactive className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-success/10 text-success">
                <BarChart3 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink font-medium">Gráficos</p>
                <p className="text-caption text-ink-subtle">Visualizar gastos por categoria e tempo</p>
              </div>
            </Card>
          </Link>
          <button
            onClick={() => { setMenuOpen(false); setRefreshing(true); load(); }}
            className="text-left"
          >
            <Card interactive className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-muted text-ink-muted">
                <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink font-medium">Atualizar</p>
                <p className="text-caption text-ink-subtle">Recarregar dados do mês</p>
              </div>
            </Card>
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}

/** Mini indicador de tendência do saldo vs mês anterior. Chip discreto. */
function SaldoTrend({ atual, anterior }: { atual: number; anterior: number | null }) {
  if (anterior === null || anterior === 0) return null;
  const delta = atual - anterior;
  const pct = Math.round((delta / Math.abs(anterior)) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-caption font-semibold tabular-nums",
      up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
    )}>
      <Icon size={12} strokeWidth={2.4} />
      {up ? "+" : ""}{pct}%
    </span>
  );
}

/** Tile vertical estilo Apple Health: círculo tonal com ícone + label + valor.
 *  Diferenciação forte por tom (não só borda/fundo). Tap com spring. */
function StatTile({ icon: Icon, tone, label, valor, onClick }: {
  icon: typeof ArrowUpRight;
  tone: "success" | "danger" | "brand";
  label: string;
  valor: number;
  onClick?: () => void;
}) {
  const tones = {
    success: { bg: "bg-success/10", ring: "bg-success/15",  icon: "text-success" },
    danger:  { bg: "bg-danger/10",  ring: "bg-danger/15",   icon: "text-danger"  },
    brand:   { bg: "bg-brand/10",   ring: "bg-brand/15",    icon: "text-brand"   },
  }[tone];
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(
        "w-full rounded-2xl border border-hairline p-3.5 text-left",
        "flex flex-col gap-2.5 min-h-[108px]",
        "shadow-sm transition-shadow duration-base ease-apple hover:shadow-md",
        tones.bg,
      )}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tones.ring)}>
        <Icon size={16} strokeWidth={2.2} className={tones.icon} />
      </span>
      <div>
        <p className="text-eyebrow text-ink-subtle uppercase">{label}</p>
        <AnimatedBRL value={valor} compact
          className="mt-1 block text-[19px] font-bold text-ink tabular-nums leading-tight truncate" />
      </div>
    </motion.button>
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
