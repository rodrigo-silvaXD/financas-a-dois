"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Transição entre páginas — fade puro.
 * ponytail: sem `y` transform. Transform em ancestral quebra `position: sticky`
 * dos TopBars — troca leve por sticky-que-funciona.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.16, ease: "linear" } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
