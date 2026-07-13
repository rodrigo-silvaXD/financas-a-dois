"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
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
        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-bodysm text-ink-muted">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-brand font-semibold">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
