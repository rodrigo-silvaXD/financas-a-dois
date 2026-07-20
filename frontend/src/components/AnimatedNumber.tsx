"use client";

import { useEffect, useRef, useState } from "react";
import { formatBRL, formatBRLCompact } from "@/lib/format";

/**
 * Anima value do valor anterior (ou 0 se primeira render) até o target.
 * ease-out cubic ~600ms por default. Cancela em unmount / novo target.
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState<number>(target);
  const prevRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = Number.isFinite(target) ? target : 0;
    if (from === to) { setValue(to); return; }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Exibe um valor monetário BRL animando de 0 (ou anterior) até `value`.
 *  Passe `compact` pra formato abreviado (R$ 12,3k) em espaços apertados. */
export function AnimatedBRL({ value, className, compact }: {
  value: number; className?: string; compact?: boolean;
}) {
  const v = useCountUp(value);
  return <span className={className}>{compact ? formatBRLCompact(v) : formatBRL(v)}</span>;
}
