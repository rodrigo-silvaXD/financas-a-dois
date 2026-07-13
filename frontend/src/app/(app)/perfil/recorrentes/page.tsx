"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { BottomSheet, Button, Card, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL, parseBRL, formatBRNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { deleteRecurring, listRecurring, saveRecurring, type Recurring } from "@/lib/recurring";
import type { Category } from "@/lib/types";

type Draft = {
  id?: string; nome: string; valorStr: string; categoria_id: string | null;
  dia_do_mes: number; ativo: boolean;
};

export default function RecorrentesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Recurring[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [rs, { data: c }] = await Promise.all([
      listRecurring(user.id),
      supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true).order("ordem"),
    ]);
    setItems(rs); setCats((c ?? []) as Category[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  function abrirNovo() {
    setDraft({ nome: "", valorStr: "", categoria_id: null, dia_do_mes: 1, ativo: true });
  }
  function abrirEdit(r: Recurring) {
    setDraft({
      id: r.id, nome: r.nome, valorStr: formatBRNumber(Number(r.valor)),
      categoria_id: r.categoria_id, dia_do_mes: r.dia_do_mes, ativo: r.ativo,
    });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user || !draft) return;
    const valor = parseBRL(draft.valorStr);
    if (!draft.nome.trim() || valor <= 0) return;
    await saveRecurring(user.id, {
      id: draft.id, nome: draft.nome.trim(), valor,
      categoria_id: draft.categoria_id, dia_do_mes: draft.dia_do_mes, ativo: draft.ativo,
    });
    setDraft(null);
    await load();
    toast.success("Recorrente salvo");
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta recorrência? Lançamentos passados não são apagados.")) return;
    await deleteRecurring(id);
    await load();
    toast.success("Recorrente excluído");
  }

  async function toggle(r: Recurring) {
    await saveRecurring(r.user_id, { ...r, ativo: !r.ativo });
    await load();
  }

  return (
    <main>
      <TopBar title="Gastos recorrentes" showBack rightSlot={
        <button onClick={abrirNovo} aria-label="Novo recorrente"
          className="rounded-md p-1.5 text-brand hover:bg-surface-muted transition-colors duration-base ease-apple">
          <Plus size={22} />
        </button>
      } />

      <section className="mx-auto max-w-md px-4 pt-4">
        {loading ? (
          <Card className="text-center text-ink-subtle">Carregando…</Card>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhum recorrente"
            description="Cadastre gastos que se repetem todo mês (aluguel, streaming, academia). Eles entram automaticamente no dia."
            action={<Button onClick={abrirNovo}><Plus size={18} /> Novo recorrente</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((r) => {
              const cat = cats.find((c) => c.id === r.categoria_id);
              return (
                <li key={r.id}>
                  <Card className={cn("flex items-center gap-3 p-3", !r.ativo && "opacity-50")}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-ink-muted">
                      {cat ? <CategoryIcon name={cat.icone} size={18} strokeWidth={1.75} /> : <Repeat size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-ink">{r.nome}</p>
                      <p className="text-caption text-ink-subtle">Dia {r.dia_do_mes} · {formatBRL(Number(r.valor))}</p>
                    </div>
                    <label className="mr-2 flex items-center gap-1 text-caption text-ink-muted">
                      <input type="checkbox" checked={r.ativo} onChange={() => toggle(r)} />
                    </label>
                    <button onClick={() => abrirEdit(r)} aria-label="Editar"
                      className="rounded-md p-1.5 text-ink-muted hover:text-ink transition-colors duration-base ease-apple">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => excluir(r.id)} aria-label="Excluir"
                      className="rounded-md p-1.5 text-ink-muted hover:text-danger transition-colors duration-base ease-apple">
                      <Trash2 size={16} />
                    </button>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BottomSheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Editar recorrente" : "Novo recorrente"}>
        {draft && (
          <form onSubmit={salvar} className="space-y-3">
            <Input name="nome" label="Nome" value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} required />
            <label className="block">
              <span className="text-bodysm text-ink-muted font-medium">Valor (R$)</span>
              <input inputMode="decimal" value={draft.valorStr} onChange={(e) => setDraft({ ...draft, valorStr: e.target.value })} placeholder="0,00"
                className="mt-1.5 h-12 w-full rounded-md bg-surface-muted px-4 text-body text-ink text-right outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple" />
            </label>
            <label className="block">
              <span className="text-bodysm text-ink-muted font-medium">Categoria</span>
              <select value={draft.categoria_id ?? ""} onChange={(e) => setDraft({ ...draft, categoria_id: e.target.value || null })}
                className="mt-1.5 h-12 w-full rounded-md bg-surface-muted px-3 text-body text-ink outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple">
                <option value="">— sem categoria —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <Input name="dia" label="Dia do mês" type="number" min={1} max={31}
              value={String(draft.dia_do_mes)} onChange={(e) => setDraft({ ...draft, dia_do_mes: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.ativo} onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })} />
              <span className="text-bodysm text-ink">Ativo</span>
            </label>
            <Button type="submit" size="lg" className="w-full">Salvar</Button>
          </form>
        )}
      </BottomSheet>
    </main>
  );
}
