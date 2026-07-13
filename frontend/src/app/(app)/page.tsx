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
import { Badge, Card, EmptyState, ProgressBar, TopBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GoalCard } from "@/components/GoalCard";
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

  // Alerta de limite por categoria (>= 85% do limite_mensal)
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
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <Sparkles size={20} />
            </Link>
            <Link href="/graficos" aria-label="Gráficos"
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <BarChart3 size={20} />
            </Link>
            <button onClick={() => { setRefreshing(true); load(); }} aria-label="Atualizar"
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple">
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

      <section className="mx-auto max-w-md px-4 pt-2 space-y-4">
        <div>
          <p className="text-body text-ink-muted">
            Olá, <span className="text-ink font-semibold">{profile?.nome ?? "…"}</span> 👋
          </p>
        </div>

        <Card className="p-6">
          <span className="text-caption text-ink-subtle uppercase tracking-wide">Saldo do mês</span>
          <div className="mt-1">
            <span className={`text-display ${saldo >= 0 ? "text-ink" : "text-danger"}`}>{formatBRL(saldo)}</span>
          </div>
          <div className="mt-4">
            <ProgressBar value={pctGasto} tone={pctGasto > 80 ? "warning" : "brand"}
              label={entradas > 0 ? `Você já gastou ${Math.round(pctGasto)}% do que entrou` : "Sem entradas este mês"} />
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <MiniCard icon={<ArrowUpRight size={18} />} tone="success" label="Entrou" valor={entradas} />
          <MiniCard icon={<ArrowDownRight size={18} />} tone="danger" label="Saiu"    valor={gastos} />
          <MiniCard icon={<PiggyBank size={18} />}    tone="brand"   label="Economia" valor={Math.max(0, saldo)} />
        </div>

        {/* Alertas de limite por categoria */}
        {alertasLimite.length > 0 && (
          <div className="space-y-2">
            {alertasLimite.map(({ c, gasto, pct }) => {
              const tone = pct >= 100 ? "danger" : "warning";
              return (
                <Card key={c.id} className={cn(
                  "flex items-start gap-3 p-3",
                  tone === "danger" ? "border-danger/40" : "border-warning/40",
                )}>
                  <AlertTriangle size={18} className={cn("mt-0.5", tone === "danger" ? "text-danger" : "text-warning")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink">
                      Você já usou <span className="font-semibold">{Math.round(pct)}%</span> do limite de <span className="font-semibold">{formatBRL(Number(c.limite_mensal))}</span> em {c.nome}.
                    </p>
                    <p className="text-caption text-ink-subtle">Gastou {formatBRL(gasto)} este mês.</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Meus Objetivos */}
        {topGoals.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-heading text-ink">Meus Objetivos</h2>
              <Link href="/objetivos" className="text-bodysm text-brand font-semibold">Ver todos</Link>
            </div>
            <div className="space-y-2">
              {topGoals.map((g) => (
                <Link key={g.id} href="/objetivos"><GoalCard goal={g} /></Link>
              ))}
            </div>
          </div>
        )}
        {topGoals.length === 0 && (
          <Link href="/objetivos">
            <Card interactive className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-brand/10 p-2 text-brand"><Target size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink">Crie um objetivo</p>
                <p className="text-caption text-ink-subtle">Casa, viagem, casamento…</p>
              </div>
            </Card>
          </Link>
        )}

        {/* Parcelamentos ativos */}
        {parcelas.length > 0 && (
          <div>
            <h2 className="mb-2 text-heading text-ink">Parcelamentos ativos</h2>
            <ul className="space-y-2">
              {parcelas.map((p) => (
                <li key={p.parcelamento_id}>
                  <Card className="flex items-center gap-3 p-3">
                    <div className="rounded-md bg-surface-muted p-2 text-ink-muted"><Wallet size={16} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-ink">{p.descricao ?? "Compra parcelada"}</p>
                      <p className="text-caption text-ink-subtle">
                        {p.parcelas_pagas}/{p.parcela_total} · {formatBRL(p.valor)}/parcela
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Últimos lançamentos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-heading text-ink">Últimos lançamentos</h2>
            <Link href="/extrato" className="text-bodysm text-brand font-semibold">Ver todos</Link>
          </div>

          {loading ? (
            <Card className="text-center text-ink-subtle">Carregando…</Card>
          ) : ultimos.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum lançamento este mês"
              description="Toque no + pra registrar seu primeiro gasto ou entrada." />
          ) : (
            <ul className="space-y-2">
              {ultimos.map((r) => <TransactionRowItem key={r.id} row={r} />)}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function MiniCard({ icon, tone, label, valor }: {
  icon: React.ReactNode; tone: "success" | "danger" | "brand"; label: string; valor: number;
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-brand";
  return (
    <Card className="p-3">
      <div className={`flex items-center gap-1 text-caption ${toneClass}`}>{icon}<span>{label}</span></div>
      <p className="mt-1 text-bodysm font-semibold text-ink truncate">{formatBRL(valor)}</p>
    </Card>
  );
}

function TransactionRowItem({ row }: { row: Row }) {
  const isEntry = row.tipo === "entrada";
  return (
    <motion.li initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}>
      <Card className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md"
          style={{ background: row.categoria?.cor ?? "rgb(var(--surface-muted))", color: "rgb(var(--ink-muted))" }}>
          {row.categoria?.icone
            ? <CategoryIcon name={row.categoria.icone} size={18} strokeWidth={1.75} />
            : <Wallet size={18} strokeWidth={1.75} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-ink">{row.descricao || row.categoria?.nome || "Sem descrição"}</p>
          <p className="text-caption text-ink-subtle">{formatDateShort(row.data)}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-body font-semibold ${isEntry ? "text-success" : "text-danger"}`}>
            {isEntry ? "+" : "−"} {formatBRL(Number(row.valor))}
          </span>
          {(row.origem === "ia_texto" || row.origem === "ia_foto") && (
            <Badge tone="brand" className="mt-0.5">✨ IA</Badge>
          )}
          {row.parcela_total && row.parcela_atual && (
            <Badge tone="neutral" className="mt-0.5">{row.parcela_atual}/{row.parcela_total}</Badge>
          )}
        </div>
      </Card>
    </motion.li>
  );
}
