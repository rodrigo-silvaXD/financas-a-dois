"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

type Theme = "light" | "dark";
type ThemePref = Theme | "system";

type ThemeCtx = {
  theme: Theme;          // tema efetivo
  preference: ThemePref; // escolha do usuário (system permite auto)
  setPreference: (p: ThemePref) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "theme-preference";

function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePref>("system");
  const [theme, setTheme] = useState<Theme>("light");

  // hydrate preference from storage (roda 1x)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePref | null;
    const pref: ThemePref = stored ?? "system";
    setPreferenceState(pref);
    setTheme(resolveTheme(pref));
  }, []);

  // Se o user tem theme_preference no metadata (outro dispositivo), aplica.
  useEffect(() => {
    const remote = user?.user_metadata?.theme_preference as ThemePref | undefined;
    if (!remote) return;
    if (remote === preference) return;
    setPreferenceState(remote);
    setTheme(resolveTheme(remote));
    localStorage.setItem(STORAGE_KEY, remote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_metadata?.theme_preference]);

  // aplica classe .dark no <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // segue o sistema quando pref = system
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [preference]);

  const setPreference = useCallback((p: ThemePref) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPreferenceState(p);
    setTheme(resolveTheme(p));
    // Persiste no Supabase pra sincronizar entre dispositivos.
    // ponytail: sem retry — se falhar, localStorage guarda; next login corrige.
    supabase.auth.updateUser({ data: { theme_preference: p } }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setPreference(next);
  }, [theme, setPreference]);

  return (
    <Ctx.Provider value={{ theme, preference, setPreference, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}
