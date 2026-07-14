"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; text: string; tone: "success" | "danger" };
type Ctx = {
  success: (text: string) => void;
  error: (text: string) => void;
};

const Ctx = createContext<Ctx | null>(null);
const DURATION = 2000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const lastErrorRef = useRef<{ text: string; at: number } | null>(null);

  const push = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, text, tone }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), DURATION);
  }, []);

  // Escuta erros globais de api() — mostra toast mesmo se o chamador não tratou.
  // Dedup: mesmo texto em <1s vira 1 toast (evita explosão em falha em cascata).
  useEffect(() => {
    function onApiError(e: Event) {
      const detail = (e as CustomEvent<string>).detail || "Falha na conexão";
      const now = Date.now();
      const last = lastErrorRef.current;
      if (last && last.text === detail && now - last.at < 1000) return;
      lastErrorRef.current = { text: detail, at: now };
      push(detail, "danger");
    }
    window.addEventListener("app-error", onApiError);
    return () => window.removeEventListener("app-error", onApiError);
  }, [push]);

  return (
    <Ctx.Provider value={{
      success: (t) => push(t, "success"),
      error:   (t) => push(t, "danger"),
    }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md flex-col items-center gap-2 px-4 safe-top"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className={cn(
                "flex items-center gap-2 rounded-pill px-4 py-2 shadow-md",
                "bg-surface border border-hairline text-ink",
                t.tone === "success" && "text-success",
                t.tone === "danger"  && "text-danger",
              )}
            >
              {t.tone === "success" && <Check size={16} strokeWidth={2.4} />}
              {t.tone === "danger"  && <AlertTriangle size={16} strokeWidth={2.4} />}
              <span className="text-bodysm font-medium">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return c;
}
