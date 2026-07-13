"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:   "bg-brand text-brand-ink hover:bg-brand-hover",
  secondary: "bg-surface-muted text-ink hover:bg-hairline",
  ghost:     "bg-transparent text-ink hover:bg-surface-muted",
};

const sizeClass: Record<Size, string> = {
  md: "h-11 px-4 text-button",
  lg: "h-14 px-6 text-button",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "transition-colors duration-base ease-apple",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled || loading}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? <span className="animate-pulse">…</span> : children}
    </motion.button>
  );
});
