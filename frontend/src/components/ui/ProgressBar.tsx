import { cn } from "@/lib/cn";

interface Props {
  value: number;   // 0..100
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
  label?: string;
}

const toneClass = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export function ProgressBar({ value, tone = "brand", label, className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex justify-between text-caption text-ink-muted">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-pill bg-surface-muted overflow-hidden">
        <div
          className={cn("h-full transition-[width] duration-slow ease-apple-out", toneClass[tone])}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
