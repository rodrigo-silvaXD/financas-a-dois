"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, PiggyBank, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { formatBRL, formatDateShort } from "@/lib/format";
import { Badge, Card, EmptyState, ProgressBar, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { Category, Profile, TransactionRow } from "@/lib/types";

type Row = TransactionRow & { categoria: Pick<Category, "nome" | "icone" | "cor"> | null };

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const monthStart = new Date(); monthStart.setDate(1);
    const iso = monthStart.toISOString().slice(0, 10);

    const [{ data: prof }, { data: tx }] = await Promise.all([
      supabase.from("profiles").select("id, nome, avatar_url").eq("id", user.id).single(),
      supabase.from("transactions")
        .select("*, categoria:categories(nome, icone, cor)")
        .gte("data", iso)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    setProfile(prof as Profile | null);
    setRows((tx ?? []) as Row[]);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const gastos   = rows.filter((r) => r.tipo === "gasto"  ).reduce((s, r) => s + Number(r.valor), 0);
  const saldo    = entradas - gastos;
  const pctGasto = entradas > 0 ? Math.min(100, (gastos / entradas) * 100) : 0;

  const ultimos = rows.slice(0, 5);

  return (
    <main>
      <TopBar
        title=""
        rightSlot={
          <button
            onClick={() => { setRefreshing(true); load(); }}
            aria-label="Atualizar"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
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
            <span className={`text-display ${saldo >= 0 ? "text-ink" : "text-danger"}`}>
              {formatBRL(saldo)}
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={pctGasto}
              tone={pctGasto > 80 ? "warning" : "brand"}
              label={entradas > 0 ? `Você já gastou ${Math.round(pctGasto)}% do que entrou` : "Sem entradas este mês"}
            />
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <MiniCard icon={<ArrowUpRight size={18} />} tone="success" label="Entrou" valor={entradas} />
          <MiniCard icon={<ArrowDownRight size={18} />} tone="danger" label="Saiu"    valor={gastos} />
          <MiniCard icon={<PiggyBank size={18} />}    tone="brand"   label="Economia" valor={Math.max(0, saldo)} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-heading text-ink">Últimos lançamentos</h2>
            <Link href="/extrato" className="text-bodysm text-brand font-semibold">Ver todos</Link>
          </div>

          {loading ? (
            <Card className="text-center text-ink-subtle">Carregando…</Card>
          ) : ultimos.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum lançamento este mês"
              description="Toque no + pra registrar seu primeiro gasto ou entrada."
            />
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

function MiniCard({
  icon, tone, label, valor,
}: { icon: React.ReactNode; tone: "success" | "danger" | "brand"; label: string; valor: number }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-brand";
  return (
    <Card className="p-3">
      <div className={`flex items-center gap-1 text-caption ${toneClass}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-bodysm font-semibold text-ink truncate">{formatBRL(valor)}</p>
    </Card>
  );
}

function TransactionRowItem({ row }: { row: Row }) {
  const isEntry = row.tipo === "entrada";
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card className="flex items-center gap-3 p-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-md"
          style={{ background: row.categoria?.cor ?? "rgb(var(--surface-muted))", color: "rgb(var(--ink-muted))" }}
        >
          {row.categoria?.icone
            ? <CategoryIcon name={row.categoria.icone} size={18} strokeWidth={1.75} />
            : <Wallet size={18} strokeWidth={1.75} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-ink">
            {row.descricao || row.categoria?.nome || "Sem descrição"}
          </p>
          <p className="text-caption text-ink-subtle">{formatDateShort(row.data)}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-body font-semibold ${isEntry ? "text-success" : "text-danger"}`}>
            {isEntry ? "+" : "−"} {formatBRL(Number(row.valor))}
          </span>
          {(row.origem === "ia_texto" || row.origem === "ia_foto") && (
            <Badge tone="brand" className="mt-0.5">✨ IA</Badge>
          )}
        </div>
      </Card>
    </motion.li>
  );
}
