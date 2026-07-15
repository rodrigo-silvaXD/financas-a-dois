import { Sparkles, Camera, Repeat, Download, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TransactionRow } from "@/lib/types";

type OriginKey = TransactionRow["origem"] | "parcelamento";

/**
 * Famílias de cor bem distintas entre si, com variante clara/escura
 * pra manter contraste nos dois temas.
 */
const META: Record<OriginKey, { label: string; icon: LucideIcon | null; className: string }> = {
  manual:       { label: "Manual",     icon: null,     className: "bg-surface-muted text-ink-muted" },
  ia_texto:     { label: "IA Texto",   icon: Sparkles, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ia_foto:      { label: "IA Foto",    icon: Camera,   className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  recorrente:   { label: "Recorrente", icon: Repeat,   className: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  importado:    { label: "Importado",  icon: Download, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  parcelamento: { label: "Parcelado",  icon: Layers,   className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
};

/**
 * Badge colorido por origem do lançamento. `parcela` sobrepõe a origem
 * (num gasto parcelado, saber a parcela importa mais que a origem).
 */
export function OriginBadge({ origem, parcela }: {
  origem: TransactionRow["origem"];
  parcela?: { atual: number; total: number } | null;
}) {
  const key: OriginKey = parcela ? "parcelamento" : origem;
  const { label, icon: Icon, className } = META[key];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium", className)}>
      {Icon && <Icon size={11} strokeWidth={2.2} />}
      {parcela ? `${parcela.atual}/${parcela.total}` : label}
    </span>
  );
}
