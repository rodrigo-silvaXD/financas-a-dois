"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Transição entre páginas:
 *  entrada: y 20 → 0 + opacity 0 → 1 · 280ms · ease-out
 *  saída:   opacity 0 · 200ms · linear
 * Chave por pathname faz AnimatePresence detectar troca de rota.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1, y: 0,
          transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        }}
        exit={{
          opacity: 0,
          transition: { duration: 0.20, ease: "linear" },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
