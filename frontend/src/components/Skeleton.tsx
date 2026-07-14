import { cn } from "@/lib/cn";

/**
 * Bloco cinza com pulse shimmer. Usar como placeholder de conteúdo enquanto carrega.
 * ponytail: sem gradient animado — o Tailwind animate-pulse basta e é acessível.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-muted", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-surface border border-hairline p-5 space-y-3", className)}>
      <Skeleton className="h-4 w-1/3 rounded-md" />
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-2 w-full rounded-pill" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface border border-hairline p-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
      </div>
      <Skeleton className="h-5 w-16 rounded-md" />
    </div>
  );
}
