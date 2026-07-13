"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { Card, EmptyState, TopBar } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/cn";
import { fetchTxForCharts, mesKey, ultimosMesesLabels, type Periodo } from "@/lib/charts";
import { BarChart3 } from "lucide-react";

// Paleta alinhada ao design system (indigo + coral + semânticos).
const PALETTE = ["#4C5FA8", "#F97066", "#10B981", "#F59E0B", "#8A97D4", "#5B5B72", "#7A7FAD", "#EF4444"];

const periodos: { v: Periodo; label: string }[] = [
  { v: 3, label: "3 meses" }, { v: 6, label: "6 meses" }, { v: 12, label: "1 ano" },
];

export default function GraficosPage() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(6);
  const [tx, setTx] = useState<Awaited<ReturnType<typeof fetchTxForCharts>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setTx(await fetchTxForCharts(user.id, periodo));
    setLoading(false);
  }, [user, periodo]);
  useEffect(() => { load(); }, [load]);

  const meses = useMemo(() => ultimosMesesLabels(periodo), [periodo]);

  // 1) Gastos por categoria — donut.
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tx) {
      if (t.tipo !== "gasto") continue;
      const nome = t.categoria?.nome ?? "Sem categoria";
      map.set(nome, (map.get(nome) ?? 0) + Number(t.valor));
    }
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tx]);

  // 2) Gastos por mês, 3) evolução (entradas−gastos), 4) entradas vs saídas.
  const porMes = useMemo(() => {
    const base = new Map(meses.map((m) => [m.key, { mes: m.label, entradas: 0, gastos: 0 }]));
    for (const t of tx) {
      const key = mesKey(t.data);
      const row = base.get(key);
      if (!row) continue;
      if (t.tipo === "gasto") row.gastos    += Number(t.valor);
      else                    row.entradas  += Number(t.valor);
    }
    return Array.from(base.values()).map((r) => ({ ...r, economia: r.entradas - r.gastos }));
  }, [tx, meses]);

  if (loading) return <main><TopBar title="Gráficos" showBack /><section className="mx-auto max-w-md px-4 pt-4"><Card className="text-center text-ink-subtle">Carregando…</Card></section></main>;
  if (tx.length === 0) return (
    <main>
      <TopBar title="Gráficos" showBack />
      <section className="mx-auto max-w-md px-4 pt-4">
        <EmptyState icon={BarChart3} title="Sem dados" description="Registre alguns lançamentos e volta aqui." />
      </section>
    </main>
  );

  return (
    <main>
      <TopBar title="Gráficos" showBack />
      <section className="mx-auto max-w-md px-4 pt-2 pb-6 space-y-4">
        {/* Chips de período */}
        <div className="flex gap-2 pb-2">
          {periodos.map((p) => (
            <button key={p.v} onClick={() => setPeriodo(p.v)}
              className={cn("shrink-0 rounded-pill px-3 py-1.5 text-bodysm font-medium transition-colors duration-base ease-apple",
                periodo === p.v ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted")}>
              {p.label}
            </button>
          ))}
        </div>

        <ChartCard title="Gastos por categoria">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}
                paddingAngle={2} isAnimationActive animationDuration={600}>
                {porCategoria.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatBRL(Number(v) || 0)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gastos por mês">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <Tooltip formatter={(v) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="gastos" fill="#EF4444" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução da economia">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <Tooltip formatter={(v) => formatBRL(Number(v) || 0)} />
              <Line type="monotone" dataKey="economia" stroke="#4C5FA8" strokeWidth={2.5}
                dot={{ r: 3 }} isAnimationActive animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Entradas vs Saídas">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--ink-subtle))" />
              <Tooltip formatter={(v) => formatBRL(Number(v) || 0)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entradas" fill="#10B981" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
              <Bar dataKey="gastos"   fill="#EF4444" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </main>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <h3 className="text-heading text-ink mb-2">{title}</h3>
        {children}
      </Card>
    </motion.div>
  );
}
