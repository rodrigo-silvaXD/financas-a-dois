"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BiometricGate } from "@/components/BiometricGate";

/**
 * Redireciona pra /login se não houver sessão ativa.
 * Uso: envolver o layout do grupo (app).
 * ponytail: guard client-side. Middleware SSR só se PWA virar SSR (não é o caso).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span
          aria-label="Carregando"
          className="h-8 w-8 rounded-full border-2 border-hairline border-t-brand animate-spin"
        />
      </div>
    );
  }
  return <BiometricGate>{children}</BiometricGate>;
}
