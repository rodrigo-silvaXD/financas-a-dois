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
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-pill bg-surface-muted p-4">
          <Icon size={28} className="text-ink-muted" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-heading text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-body text-ink-muted max-w-xs">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
