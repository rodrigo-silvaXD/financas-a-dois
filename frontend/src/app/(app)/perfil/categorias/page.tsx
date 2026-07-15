"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomSheet, Button, Card, CurrencyInput, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon, CategoryAvatar } from "@/components/CategoryIcon";
import { SkeletonRow, useMinLoading } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { CATEGORY_PALETTE } from "@/lib/categoryColors";
import type { Category } from "@/lib/types";

// Set de ícones sugeridos (pode adicionar mais nome kebab do Lucide livremente).
const iconePool = [
  "shopping-cart", "utensils", "car", "pill", "church", "home", "building",
  "graduation-cap", "gamepad-2", "tv", "heart-pulse", "dumbbell", "gift",
  "cat", "more-horizontal", "coffee", "plane", "book", "shirt", "fuel",
  "wifi", "phone", "baby", "briefcase", "dog", "wrench",
];

type Draft = {
  id?: string; nome: string; icone: string; cor: string | null;
  ativa: boolean; ordem: number; limite: number;
};

export default function CategoriasPage() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("categories")
      .select("*").eq("user_id", user.id).order("ordem");
    setCats((data ?? []) as Category[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  function abrirNovo() {
    setDraft({
      nome: "", icone: "more-horizontal", cor: null, ativa: true,
      ordem: (cats.at(-1)?.ordem ?? 0) + 1, limite: 0,
    });
  }
  function abrirEdit(c: Category) {
    setDraft({
      id: c.id, nome: c.nome, icone: c.icone, cor: c.cor, ativa: c.ativa,
      ordem: c.ordem, limite: c.limite_mensal ? Number(c.limite_mensal) : 0,
    });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user || !draft) return;
    if (!draft.nome.trim()) return;
    setSaving(true);
    try {
      const patch = {
        nome: draft.nome.trim(), icone: draft.icone, cor: draft.cor,
        ativa: draft.ativa, ordem: draft.ordem,
        limite_mensal: draft.limite > 0 ? draft.limite : null,
      };
      if (draft.id) {
        await supabase.from("categories").update(patch).eq("id", draft.id);
      } else {
        await supabase.from("categories").insert({ user_id: user.id, ...patch });
      }
      setDraft(null);
      load();
    } finally { setSaving(false); }
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

      <section className="mx-auto max-w-md px-5 pt-4">
        {showSkeleton ? (
          <div className="space-y-3">
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : cats.length === 0 ? (
          <EmptyState title="Nenhuma categoria" description="Toque em + no topo para criar." />
        ) : (
          <motion.ul className="space-y-3"
            variants={staggerContainerFast} initial="initial" animate="animate">
            {cats.map((c) => (
              <motion.li key={c.id} variants={fadeUpItem}>
                <Card className={cn("flex items-center gap-3 p-4", !c.ativa && "opacity-50")}>
                  <CategoryAvatar categoria={c} />
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
              </motion.li>
            ))}
          </motion.ul>
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
            <div>
              <span className="text-bodysm text-ink-muted font-medium">Cor</span>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {CATEGORY_PALETTE.map((c) => {
                  const active = draft.cor === c.hex;
                  return (
                    <button key={c.hex} type="button" aria-label={c.nome}
                      onClick={() => setDraft({ ...draft, cor: c.hex })}
                      className={cn("aspect-square rounded-full transition-all duration-base ease-apple",
                        active ? "ring-2 ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105")}
                      style={{ background: c.hex }} />
                  );
                })}
              </div>
            </div>
            <CurrencyInput label="Limite mensal (opcional)" value={draft.limite}
              onChange={(v) => setDraft({ ...draft, limite: v })}
              hint="Deixe zero para não ter limite. Alerta em 85%." />
            <Input name="ordem" label="Ordem" type="number" value={String(draft.ordem)}
              onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) || 0 })} />
            <Button type="submit" size="lg" className="w-full" loading={saving}>Salvar</Button>
          </form>
        )}
      </BottomSheet>
    </main>
  );
}
