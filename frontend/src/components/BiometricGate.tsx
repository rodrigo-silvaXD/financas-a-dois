"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  authenticateBiometric, biometricSupported, isUnlocked, markUnlocked,
} from "@/lib/webauthn";

/**
 * Tela de desbloqueio biométrico: aparece a cada abertura do app (por sessão
 * de aba) quando o usuário ativou a biometria. Fallback de email/senha sempre
 * disponível — faz signOut e volta pro /login.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const bioAtiva = !!user?.user_metadata?.biometria_ativa;
  const needsUnlock = bioAtiva && biometricSupported() && !isUnlocked();

  const [locked, setLocked] = useState(needsUnlock);
  const [verifying, setVerifying] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const attempted = useRef(false);

  const fallbackLogin = useCallback(async () => {
    markUnlocked();
    await signOut();
    router.replace("/login");
  }, [router, signOut]);

  const unlock = useCallback(async () => {
    setVerifying(true); setErro(null);
    try {
      await authenticateBiometric();
      setLocked(false);
    } catch (e) {
      // 401 = sessão expirou no backend. Nada a fazer aqui — força logout limpo.
      if (e instanceof ApiError && e.status === 401) {
        setErro("Sua sessão expirou. Entre com email e senha.");
        await fallbackLogin();
        return;
      }
      setErro("Não foi possível verificar. Tente de novo ou use email e senha.");
    } finally {
      setVerifying(false);
    }
  }, [fallbackLogin]);

  // Tenta automaticamente 1x ao abrir — igual apps de banco.
  useEffect(() => {
    if (locked && !attempted.current) {
      attempted.current = true;
      unlock();
    }
  }, [locked, unlock]);

  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-canvas">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-6 rounded-full bg-brand/10 p-6 text-brand">
          <Fingerprint size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-title text-ink mb-2">Finanças a Dois</h1>
        <p className="text-body text-ink-muted max-w-xs leading-relaxed">
          Use sua biometria para desbloquear o app.
        </p>
        {erro && <p className="mt-4 text-caption text-danger max-w-xs">{erro}</p>}

        <Button size="lg" className="mt-8 w-full max-w-xs" onClick={unlock}
          loading={verifying} loadingLabel="Verificando…">
          <Fingerprint size={18} /> Desbloquear
        </Button>
        <button
          onClick={fallbackLogin}
          className="mt-4 text-bodysm text-brand font-semibold py-2"
        >
          Entrar com email e senha
        </button>
      </motion.div>
    </div>
  );
}
