"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastAction = { label: string; onClick: () => void };
type Toast = {
  id: number;
  text: string;
  tone: "success" | "danger";
  action?: ToastAction;
  onDismiss?: () => void;   // chamado se o toast expirar sem a ação ser clicada
};
type Ctx = {
  success: (text: string) => void;
  error: (text: string) => void;
  /** Toast com ação (ex.: Desfazer). Dura mais tempo pra dar tempo de reagir. */
  withAction: (text: string, action: ToastAction, opts?: { tone?: Toast["tone"]; onDismiss?: () => void }) => void;
};

const Ctx = createContext<Ctx | null>(null);
const DURATION = 2000;
const DURATION_ACTION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const lastErrorRef = useRef<{ text: string; at: number } | null>(null);

  const push = useCallback((text: string, tone: Toast["tone"], action?: ToastAction, onDismiss?: () => void) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, text, tone, action, onDismiss }]);
    const dur = action ? DURATION_ACTION : DURATION;
    setTimeout(() => {
      setItems((p) => {
        const found = p.find((t) => t.id === id);
        if (found?.onDismiss) found.onDismiss();
        return p.filter((t) => t.id !== id);
      });
    }, dur);
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
      success:    (t) => push(t, "success"),
      error:      (t) => push(t, "danger"),
      withAction: (t, action, opts) => push(t, opts?.tone ?? "success", action, opts?.onDismiss),
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
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.18, ease: "linear" } }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
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
              {t.action && (
                <button
                  className="pointer-events-auto ml-2 rounded-pill px-3 py-1 text-caption font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors duration-base ease-apple"
                  onClick={() => {
                    t.action!.onClick();
                    setItems((p) => p.filter((x) => x.id !== t.id));
                    // Não chama onDismiss — o user reagiu.
                  }}
                >
                  {t.action.label}
                </button>
              )}
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
