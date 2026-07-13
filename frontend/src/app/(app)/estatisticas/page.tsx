"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Button, Card, EmptyState, TopBar } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { api } from "@/lib/api";
import { calcularMetricas, type Metricas } from "@/lib/stats";
import { cn } from "@/lib/cn";

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function EstatisticasPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [ym] = useState(currentYm);
  const [met, setMet] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMet(await calcularMetricas(user.id, ym));
    setLoading(false);
  }, [user, ym]);
  useEffect(() => { load(); }, [load]);

  async function gerarResumo() {
    setGerando(true);
    try {
      const res = await api<{ texto: string; cached: boolean }>("/import/monthly-summary", {
        method: "POST", body: JSON.stringify({ year_month: ym }),
      });
      setResumo(res.texto);
      if (res.cached) toast.success("Resumo carregado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar resumo");
    } finally { setGerando(false); }
  }

  if (loading) return <main><TopBar title="Estatísticas" showBack /><section className="mx-auto max-w-md px-4 pt-4"><Card className="text-center text-ink-subtle">Carregando…</Card></section></main>;
  if (!met || (met.entradas === 0 && met.gastos === 0)) return (
    <main>
      <TopBar title="Estatísticas" showBack />
      <section className="mx-auto max-w-md px-4 pt-4">
        <EmptyState icon={BarChart3} title="Sem dados no mês" description="Registre alguns lançamentos e volta." />
      </section>
    </main>
  );

  return (
    <main>
      <TopBar title="Estatísticas" showBack />
      <section className="mx-auto max-w-md px-4 pt-2 pb-6 space-y-4">
        {/* Resumo IA */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2 text-brand">
            <Sparkles size={18} />
            <h2 className="text-heading">Resumo do mês</h2>
          </div>
          {resumo ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}
              className="text-body text-ink leading-relaxed">{resumo}</motion.p>
          ) : (
            <>
              <p className="text-bodysm text-ink-muted mb-3">Gere um resumo narrativo do mês com base nos seus dados.</p>
              <Button size="lg" className="w-full" onClick={gerarResumo} loading={gerando}>
                <Sparkles size={18} /> Gerar Resumo do Mês
              </Button>
            </>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Economia">
            <p className={cn("text-heading font-semibold", met.economia >= 0 ? "text-success" : "text-danger")}>
              {formatBRL(met.economia)}
            </p>
            <VariacaoLabel pct={met.variacaoEconomia} vsMes />
          </MetricCard>
          <MetricCard label="Média/dia (gastos)">
            <p className="text-heading font-semibold text-ink">{formatBRL(met.mediaDiariaGastos)}</p>
            <p className="text-caption text-ink-subtle">{met.diaSemanaMaisGastos ? `Pico: ${met.diaSemanaMaisGastos}` : "—"}</p>
          </MetricCard>
        </div>

        {met.maiorGasto && (
          <Card>
            <p className="text-caption text-ink-subtle uppercase tracking-wide">Maior gasto</p>
            <p className="text-heading text-ink mt-1 truncate">{met.maiorGasto.descricao}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-bodysm text-ink-muted">{met.maiorGasto.categoria ?? "—"}</span>
              <span className="text-body font-semibold text-danger">{formatBRL(met.maiorGasto.valor)}</span>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="text-heading text-ink mb-2">Categorias (mês vs anterior)</h3>
          <ul className="space-y-2">
            {met.variacaoPorCategoria.map((v) => (
              <li key={v.categoria} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-body text-ink">{v.categoria}</p>
                  <p className="text-caption text-ink-subtle">{formatBRL(v.atual)}</p>
                </div>
                <VariacaoLabel pct={v.delta_pct} />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-caption text-ink-subtle uppercase tracking-wide">{label}</p>
      <div className="mt-1">{children}</div>
    </Card>
  );
}

function VariacaoLabel({ pct, vsMes }: { pct: number; vsMes?: boolean }) {
  const positivo = pct >= 0;
  const Icon = positivo ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-semibold",
      positivo ? "text-success" : "text-danger")}>
      <Icon size={12} />
      {positivo ? "+" : ""}{Math.round(pct)}%
      {vsMes && <span className="text-ink-subtle font-normal ml-1">vs mês passado</span>}
    </span>
  );
}
