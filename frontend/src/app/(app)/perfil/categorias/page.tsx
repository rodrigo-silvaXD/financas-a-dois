"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomSheet, Button, Card, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

// Set de ícones sugeridos (pode adicionar mais nome kebab do Lucide livremente).
const iconePool = [
  "shopping-cart", "utensils", "car", "pill", "church", "home", "building",
  "graduation-cap", "gamepad-2", "tv", "heart-pulse", "dumbbell", "gift",
  "cat", "more-horizontal", "coffee", "plane", "book", "shirt", "fuel",
  "wifi", "phone", "baby", "briefcase", "dog", "wrench",
];

type Draft = { id?: string; nome: string; icone: string; cor: string | null; ativa: boolean; ordem: number };

export default function CategoriasPage() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("categories")
      .select("*").eq("user_id", user.id).order("ordem");
    setCats((data ?? []) as Category[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  function abrirNovo() {
    setDraft({ nome: "", icone: "more-horizontal", cor: null, ativa: true, ordem: (cats.at(-1)?.ordem ?? 0) + 1 });
  }
  function abrirEdit(c: Category) {
    setDraft({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor, ativa: c.ativa, ordem: c.ordem });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user || !draft) return;
    if (!draft.nome.trim()) return;
    if (draft.id) {
      await supabase.from("categories")
        .update({ nome: draft.nome.trim(), icone: draft.icone, cor: draft.cor, ativa: draft.ativa, ordem: draft.ordem })
        .eq("id", draft.id);
    } else {
      await supabase.from("categories").insert({
        user_id: user.id,
        nome: draft.nome.trim(), icone: draft.icone, cor: draft.cor, ativa: draft.ativa, ordem: draft.ordem,
      });
    }
    setDraft(null);
    load();
  }

  async function toggleAtiva(c: Category) {
    await supabase.from("categories").update({ ativa: !c.ativa }).eq("id", c.id);
    load();
  }

  return (
    <main>
      <TopBar title="Categorias" showBack rightSlot={
        <button onClick={abrirNovo} aria-label="Nova categoria"
          className="rounded-md p-1.5 text-brand hover:bg-surface-muted transition-colors duration-base ease-apple">
          <Plus size={22} />
        </button>
      } />

      <section className="mx-auto max-w-md px-4 pt-4">
        {loading ? (
          <Card className="text-center text-ink-subtle">Carregando…</Card>
        ) : cats.length === 0 ? (
          <EmptyState title="Nenhuma categoria" description="Toque em + no topo para criar." />
        ) : (
          <ul className="space-y-2">
            {cats.map((c) => (
              <li key={c.id}>
                <Card className={cn("flex items-center gap-3 p-3", !c.ativa && "opacity-50")}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-ink-muted">
                    <CategoryIcon name={c.icone} size={18} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-ink">{c.nome}</p>
                    <p className="text-caption text-ink-subtle">Ordem {c.ordem}{!c.ativa && " · inativa"}</p>
                  </div>
                  <label className="mr-2 flex items-center gap-1 text-caption text-ink-muted">
                    <input type="checkbox" checked={c.ativa} onChange={() => toggleAtiva(c)} />
                    Ativa
                  </label>
                  <button onClick={() => abrirEdit(c)} aria-label="Editar"
                    className="rounded-md p-1.5 text-ink-muted hover:text-ink transition-colors duration-base ease-apple">
                    <Pencil size={16} />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomSheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Editar categoria" : "Nova categoria"}>
        {draft && (
          <form onSubmit={salvar} className="space-y-4">
            <Input name="nome" label="Nome" value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })} required />
            <div>
              <span className="text-bodysm text-ink-muted font-medium">Ícone</span>
              <div className="mt-2 grid grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                {iconePool.map((ico) => {
                  const active = draft.icone === ico;
                  return (
                    <button key={ico} type="button"
                      onClick={() => setDraft({ ...draft, icone: ico })}
                      className={cn(
                        "aspect-square rounded-md flex items-center justify-center transition-colors duration-base ease-apple",
                        active ? "bg-brand/10 text-brand border border-brand/40"
                               : "bg-surface-muted text-ink-muted hover:text-ink",
                      )}>
                      <CategoryIcon name={ico} size={18} strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            </div>
            <Input name="cor" label="Cor (hex, opcional)" placeholder="#F1F2F5"
              value={draft.cor ?? ""} onChange={(e) => setDraft({ ...draft, cor: e.target.value || null })} />
            <Input name="ordem" label="Ordem" type="number" value={String(draft.ordem)}
              onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) || 0 })} />
            <Button type="submit" size="lg" className="w-full">Salvar</Button>
          </form>
        )}
      </BottomSheet>
    </main>
  );
}
