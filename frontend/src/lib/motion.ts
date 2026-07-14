/**
 * Variantes de motion reusáveis. Estilo Apple: entrada suave, easing "apple-out",
 * stagger discreto entre 40–80ms.
 */
import type { Variants } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1] as const;

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerContainerFast: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
  exit: {
    opacity: 0, x: -32,
    transition: { duration: 0.20, ease: "linear" },
  },
};

export const springTap = {
  type: "spring" as const,
  stiffness: 400,
  damping: 22,
};

export const springSheet = {
  type: "spring" as const,
  damping: 26,
  stiffness: 240,
};

export const easeAppleOut = easeOut;
