"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { BottomSheet, Button, Input } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import {
  dismissPrompt, markUnlocked, platformAuthAvailable, promptDismissed, registerBiometric,
} from "@/lib/webauthn";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bioPrompt, setBioPrompt] = useState(false);
  const [ativando, setAtivando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await signIn(email, password);
      markUnlocked(); // acabou de autenticar com senha — não pedir biometria já

      // Prompt de ativação: 1ª vez, com autenticador de plataforma disponível.
      const { data } = await supabase.auth.getSession();
      const jaAtiva = !!data.session?.user?.user_metadata?.biometria_ativa;
      if (!jaAtiva && !promptDismissed() && (await platformAuthAvailable())) {
        setBioPrompt(true);
        return;
      }
      router.replace("/");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function ativarBiometria() {
    setAtivando(true);
    try {
      await registerBiometric();
      toast.success("Biometria ativada");
      await new Promise((r) => setTimeout(r, 100));
      router.replace("/");
    } catch {
      toast.error("Não foi possível ativar. Você pode tentar depois.");
      router.replace("/");
    } finally {
      setAtivando(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10 safe-top safe-bottom">
      <h1 className="text-title text-ink mb-1">Bem-vindo de volta</h1>
      <p className="text-body text-ink-muted mb-8">Suas finanças, do seu jeito.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erro && <p className="text-caption text-danger">{erro}</p>}
        <Button type="submit" size="lg" loading={loading} loadingLabel="Entrando…" className="w-full mt-2">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-bodysm text-ink-muted">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-brand font-semibold">
          Cadastre-se
        </Link>
      </p>

      {/* Prompt pós-login: ativar biometria */}
      <BottomSheet open={bioPrompt} onClose={() => { dismissPrompt(); setBioPrompt(false); router.replace("/"); }}
        title="Entrar mais rápido">
        <div className="flex flex-col items-center text-center pb-2">
          <div className="mb-5 rounded-full bg-brand/10 p-5 text-brand">
            <Fingerprint size={32} strokeWidth={1.5} />
          </div>
          <p className="text-body text-ink-muted max-w-xs leading-relaxed mb-6">
            Deseja ativar o login com biometria? Da próxima vez, você desbloqueia
            o app com digital ou reconhecimento facial.
          </p>
          <Button size="lg" className="w-full" onClick={ativarBiometria}
            loading={ativando} loadingLabel="Ativando…">
            <Fingerprint size={18} /> Ativar biometria
          </Button>
          <button
            onClick={() => { dismissPrompt(); setBioPrompt(false); router.replace("/"); }}
            className="mt-4 text-bodysm text-ink-muted font-medium py-2"
          >
            Agora não
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}
