"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: Props) {
  // fecha com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 safe-bottom",
              "bg-surface rounded-t-xl border-t border-hairline shadow-md",
              "max-h-[85dvh] overflow-y-auto",
              className,
            )}
          >
            <div className="mx-auto mt-2 mb-4 h-1 w-10 rounded-full bg-hairline" />
            {title && (
              <h2 className="px-6 pb-2 text-heading text-ink">{title}</h2>
            )}
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
