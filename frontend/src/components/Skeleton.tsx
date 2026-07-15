"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Anti-flash: uma vez visível, o skeleton fica no mínimo `min` ms na tela.
 * Evita o flash de 50ms quando os dados chegam rápido — o conteúdo entra
 * de uma vez, com a animação de stagger dele.
 */
export function useMinLoading(loading: boolean, min = 300): boolean {
  const [show, setShow] = useState(loading);
  const shownAt = useRef<number>(loading ? Date.now() : 0);

  useEffect(() => {
    if (loading) {
      shownAt.current = Date.now();
      setShow(true);
      return;
    }
    const elapsed = Date.now() - shownAt.current;
    if (elapsed >= min) { setShow(false); return; }
    const t = setTimeout(() => setShow(false), min - elapsed);
    return () => clearTimeout(t);
  }, [loading, min]);

  return show;
}

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
