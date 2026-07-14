"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { Card } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useCountUp } from "@/components/AnimatedNumber";
import { formatBRL } from "@/lib/format";
import type { Goal } from "@/lib/goals";

export function GoalCard({ goal, onClick }: { goal: Goal; onClick?: () => void }) {
  const pctReal = goal.valor_meta > 0
    ? Math.min(100, (Number(goal.valor_atual) / Number(goal.valor_meta)) * 100)
    : 0;
  const pct = useCountUp(pctReal, 700);
  const valorAtualAnim = useCountUp(Number(goal.valor_atual), 700);
  const barColor = goal.cor ?? "rgb(var(--brand))";

  return (
    <Card interactive={!!onClick} onClick={onClick} className="p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-ink-muted shrink-0"
          style={goal.cor ? { background: `${goal.cor}22`, color: goal.cor } : undefined}>
          {goal.icone ? <CategoryIcon name={goal.icone} size={20} strokeWidth={1.75} /> : <Target size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-heading text-ink truncate font-semibold">{goal.nome}</p>
          <p className="text-caption text-ink-subtle mt-0.5">
            {formatBRL(valorAtualAnim)} <span className="text-ink-subtle">de {formatBRL(Number(goal.valor_meta))}</span>
          </p>
        </div>
        <span className="text-heading font-bold text-brand tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-pill bg-surface-muted overflow-hidden">
        <motion.div
          className="h-full rounded-pill"
          initial={{ width: 0 }}
          animate={{ width: `${pctReal}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: barColor }}
        />
      </div>
    </Card>
  );
}
