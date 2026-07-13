"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { Card } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL } from "@/lib/format";
import type { Goal } from "@/lib/goals";

export function GoalCard({ goal, onClick }: { goal: Goal; onClick?: () => void }) {
  const pct = goal.valor_meta > 0
    ? Math.min(100, (Number(goal.valor_atual) / Number(goal.valor_meta)) * 100)
    : 0;
  const barColor = goal.cor ?? "rgb(var(--brand))";
  return (
    <Card interactive={!!onClick} onClick={onClick} className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-ink-muted"
          style={goal.cor ? { background: `${goal.cor}22`, color: goal.cor } : undefined}>
          {goal.icone ? <CategoryIcon name={goal.icone} size={18} strokeWidth={1.75} /> : <Target size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-heading text-ink truncate">{goal.nome}</p>
          <p className="text-caption text-ink-subtle">
            {formatBRL(Number(goal.valor_atual))} de {formatBRL(Number(goal.valor_meta))}
          </p>
        </div>
        <span className="text-heading font-semibold text-brand">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-pill bg-surface-muted overflow-hidden">
        <motion.div
          className="h-full rounded-pill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: barColor }}
        />
      </div>
    </Card>
  );
}
