"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Button, Card, EmptyState, TopBar } from "@/components/ui";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { SkeletonCard, useMinLoading } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
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
  const [semDados, setSemDados] = useState(false);
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMet(await calcularMetricas(user.id, ym));
    setLoading(false);
  }, [user, ym]);
  useEffect(() => { load(); }, [load]);

  async function gerarResumo() {
    setGerando(true); setSemDados(false);
    try {
      const res = await api<{ texto: string; cached: boolean }>("/import/monthly-summary", {
        method: "POST", body: JSON.stringify({ year_month: ym }),
      });
      setResumo(res.texto);
      if (res.cached) toast.success("Resumo carregado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.toLowerCase().includes("sem dados") || msg.toLowerCase().includes("suficient")) {
        setSemDados(true);
      } else {
        toast.error(msg || "Falha ao gerar resumo");
      }
    } finally { setGerando(false); }
  }

  if (showSkeleton) return (
    <main>
      <TopBar title="Estatísticas" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 space-y-4">
        <SkeletonCard className="h-32" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
        <SkeletonCard className="h-40" />
      </section>
    </main>
  );
  if (!met || (met.entradas === 0 && met.gastos === 0)) return (
    <main>
      <TopBar title="Estatísticas" showBack />
      <section className="mx-auto max-w-md px-5 pt-4">
        <EmptyState icon={BarChart3} title="Sem dados no mês" description="Registre alguns lançamentos e volta." />
      </section>
    </main>
  );

  return (
    <main>
      <TopBar title="Estatísticas" showBack />
      <motion.section className="mx-auto max-w-md px-5 pt-4 pb-6 space-y-6"
        variants={staggerContainerFast} initial="initial" animate="animate">
        {/* Resumo IA */}
        <motion.div variants={fadeUpItem}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3 text-brand">
              <Sparkles size={18} />
              <h2 className="text-heading font-semibold">Resumo do mês</h2>
            </div>
            {resumo ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}
                className="text-body text-ink leading-relaxed">{resumo}</motion.p>
            ) : semDados ? (
              <p className="text-body text-ink-muted leading-relaxed">
                Adicione alguns lançamentos primeiro para gerar o resumo do mês.
              </p>
            ) : (
              <>
                <p className="text-bodysm text-ink-muted mb-4 leading-relaxed">Gere um resumo narrativo do mês com base nos seus dados.</p>
                <Button size="lg" className="w-full" onClick={gerarResumo}
                  loading={gerando} loadingLabel="Gerando resumo…">
                  <Sparkles size={18} /> Gerar Resumo do Mês
                </Button>
              </>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUpItem} className="grid grid-cols-2 gap-3">
          <MetricCard label="Economia">
            <AnimatedBRL value={met.economia}
              className={cn("block text-title font-bold", met.economia >= 0 ? "text-success" : "text-danger")} />
            <VariacaoLabel pct={met.variacaoEconomia} vsMes />
          </MetricCard>
          <MetricCard label="Média/dia (gastos)">
            <AnimatedBRL value={met.mediaDiariaGastos}
              className="block text-title font-bold text-ink" />
            <p className="text-caption text-ink-subtle mt-1">{met.diaSemanaMaisGastos ? `Pico: ${met.diaSemanaMaisGastos}` : "—"}</p>
          </MetricCard>
        </motion.div>

        {met.maiorGasto && (
          <motion.div variants={fadeUpItem}>
            <Card>
              <p className="text-caption text-ink-subtle uppercase tracking-wide font-medium">Maior gasto</p>
              <p className="text-heading text-ink mt-2 truncate font-semibold">{met.maiorGasto.descricao}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-bodysm text-ink-muted">{met.maiorGasto.categoria ?? "—"}</span>
                <AnimatedBRL value={met.maiorGasto.valor} className="text-body font-semibold text-danger" />
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUpItem}>
          <Card>
            <h3 className="text-heading text-ink font-semibold mb-4">Categorias (mês vs anterior)</h3>
            <ul className="space-y-4">
              {met.variacaoPorCategoria.map((v) => (
                <li key={v.categoria} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-body text-ink font-medium">{v.categoria}</p>
                    <p className="text-caption text-ink-subtle mt-0.5">{formatBRL(v.atual)}</p>
                  </div>
                  <VariacaoLabel pct={v.delta_pct} />
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </motion.section>
    </main>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-caption text-ink-subtle uppercase tracking-wide font-medium">{label}</p>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

function VariacaoLabel({ pct, vsMes }: { pct: number; vsMes?: boolean }) {
  const positivo = pct >= 0;
  const Icon = positivo ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-semibold mt-1",
      positivo ? "text-success" : "text-danger")}>
      <Icon size={12} strokeWidth={2.4} />
      {positivo ? "+" : ""}{Math.round(pct)}%
      {vsMes && <span className="text-ink-subtle font-normal ml-1">vs mês passado</span>}
    </span>
  );
}
