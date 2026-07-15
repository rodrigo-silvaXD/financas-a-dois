"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";

export default function CadastroPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null); setMsg(null);
    setLoading(true);
    try {
      await signUp(email, password, nome);
      // Se confirmação por email estiver desligada no Supabase, já cai autenticado.
      // Se estiver ligada, mostra mensagem.
      setMsg("Cadastro criado. Verifique seu e-mail (se a confirmação estiver ativa) ou faça login.");
      setTimeout(() => router.replace("/"), 800);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10 safe-top safe-bottom">
      <h1 className="text-title text-ink mb-1">Criar conta</h1>
      <p className="text-body text-ink-muted mb-8">Vamos organizar suas finanças a dois.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nome"
          name="nome"
          autoComplete="given-name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mínimo 6 caracteres"
          required
        />
        {erro && <p className="text-caption text-danger">{erro}</p>}
        {msg && <p className="text-caption text-success">{msg}</p>}
        <Button type="submit" size="lg" loading={loading} loadingLabel="Criando conta…" className="w-full mt-2">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-bodysm text-ink-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand font-semibold">
          Entrar
        </Link>
      </p>
    </main>
  );
}
