import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-20",
        className,
      )}
    >
      {Icon && (
        <div className="mb-5 rounded-full bg-surface-muted p-5">
          <Icon size={32} className="text-ink-muted" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-heading text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-body text-ink-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
