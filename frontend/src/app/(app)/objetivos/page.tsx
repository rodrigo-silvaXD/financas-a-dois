"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Trash2 } from "lucide-react";
import { SkeletonCard, useMinLoading } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { BottomSheet, Button, CurrencyInput, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GoalCard } from "@/components/GoalCard";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { formatBRL, formatDateFull } from "@/lib/format";
import { CATEGORY_PALETTE } from "@/lib/categoryColors";
import { cn } from "@/lib/cn";
import {
  addGoalEntry, createGoal, deleteGoal, listGoalEntries, listGoals,
  type Goal, type GoalEntry,
} from "@/lib/goals";

const iconePool = [
  "home", "car", "plane", "graduation-cap", "gift", "heart",
  "piggy-bank", "sparkles", "wallet", "trending-up", "smile", "gem",
];

export default function ObjetivosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [detail, setDetail] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;
    setGoals(await listGoals(user.id));
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  async function openDetail(g: Goal) {
    setDetail(g);
    setEntries(await listGoalEntries(g.id));
  }

  return (
    <main>
      <TopBar title="Objetivos" showBack rightSlot={
        <button onClick={() => setOpenNew(true)} aria-label="Novo objetivo"
          className="rounded-lg p-2 text-brand hover:bg-surface-muted transition-colors duration-base ease-apple">
          <Plus size={22} />
        </button>
      } />

      <section className="mx-auto max-w-md px-5 pt-4 pb-6 space-y-4">
        {showSkeleton ? (
          <div className="space-y-4">
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-32" />
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhum objetivo ainda"
            description="Toque no + no topo pra criar o primeiro. Casa, viagem, casamento…"
            action={<Button onClick={() => setOpenNew(true)}><Plus size={18} /> Criar objetivo</Button>}
          />
        ) : (
          <motion.div className="space-y-4"
            variants={staggerContainerFast} initial="initial" animate="animate">
            {goals.map((g) => (
              <motion.div key={g.id} variants={fadeUpItem}>
                <GoalCard goal={g} onClick={() => openDetail(g)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <BottomSheet open={openNew} onClose={() => setOpenNew(false)} title="Novo objetivo">
        <NovoObjetivoForm onDone={async () => { setOpenNew(false); await load(); toast.success("Objetivo criado"); }} />
      </BottomSheet>

      <BottomSheet open={!!detail} onClose={() => { setDetail(null); setEntries([]); }} title={detail?.nome}>
        {detail && (
          <DetalheObjetivo
            goal={detail}
            entries={entries}
            onAdded={async () => {
              await load();
              const updated = (await listGoals(user!.id)).find((g) => g.id === detail.id) ?? detail;
              setDetail(updated);
              setEntries(await listGoalEntries(detail.id));
              toast.success("Aporte registrado");
            }}
            onDelete={async () => {
              if (!confirm("Excluir este objetivo? Todos os aportes serão perdidos.")) return;
              await deleteGoal(detail.id);
              setDetail(null); setEntries([]);
              await load();
              toast.success("Objetivo excluído");
            }}
          />
        )}
      </BottomSheet>
    </main>
  );
}

function NovoObjetivoForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [icone, setIcone] = useState("target");
  const [cor, setCor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!nome.trim() || valor <= 0) { setErro("Preencha nome e meta > 0."); return; }
    setSaving(true);
    try {
      await createGoal(user.id, { nome: nome.trim(), valor_meta: valor, icone, cor });
      await onDone();
    } catch (err) { setErro(err instanceof Error ? err.message : "Falha"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input name="nome" label="Nome" placeholder="Ex.: Casamento" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <CurrencyInput label="Valor meta" value={valor} onChange={setValor} />
      <div>
        <span className="text-bodysm text-ink-muted font-medium">Ícone</span>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {iconePool.map((i) => (
            <button key={i} type="button" onClick={() => setIcone(i)}
              className={cn("aspect-square rounded-md flex items-center justify-center transition-colors duration-base ease-apple",
                icone === i ? "bg-brand/10 text-brand border border-brand/40" : "bg-surface-muted text-ink-muted")}>
              <CategoryIcon name={i} size={18} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-bodysm text-ink-muted font-medium">Cor</span>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {CATEGORY_PALETTE.map((c) => {
            const active = cor === c.hex;
            return (
              <button key={c.hex} type="button" onClick={() => setCor(c.hex)} aria-label={c.nome}
                className={cn("aspect-square rounded-full transition-all duration-base ease-apple",
                  active ? "ring-2 ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105")}
                style={{ background: c.hex, boxShadow: active ? `0 0 0 2px ${c.hex}` : undefined }} />
            );
          })}
        </div>
      </div>
      {erro && <p className="text-caption text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>Criar objetivo</Button>
    </form>
  );
}

function DetalheObjetivo({ goal, entries, onAdded, onDelete }: {
  goal: Goal; entries: GoalEntry[];
  onAdded: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const pct = goal.valor_meta > 0 ? Math.min(100, (Number(goal.valor_atual) / Number(goal.valor_meta)) * 100) : 0;

  async function aportar(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (valor === 0) return;
    setSaving(true);
    try {
      await addGoalEntry(goal.id, user.id, valor, descricao.trim() || null);
      setValor(0); setDescricao("");
      await onAdded();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption text-ink-subtle uppercase tracking-wide">Progresso</p>
        <AnimatedBRL value={Number(goal.valor_atual)} className="block text-display text-ink" />
        <p className="text-bodysm text-ink-muted">de {formatBRL(Number(goal.valor_meta))} · {Math.round(pct)}%</p>
      </div>

      <form onSubmit={aportar} className="space-y-4">
        <CurrencyInput label="Novo aporte" value={valor} onChange={setValor} large />
        <Input name="descricao" label="Descrição (opcional)" placeholder="Ex.: bônus do trabalho"
          value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={saving}>Adicionar aporte</Button>
      </form>

      <div>
        <p className="text-caption text-ink-subtle uppercase tracking-wide mb-2">Histórico</p>
        {entries.length === 0 ? (
          <p className="text-bodysm text-ink-muted">Nenhum aporte ainda.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2">
                <div className="min-w-0">
                  <p className="text-bodysm text-ink truncate">{e.descricao ?? "Aporte"}</p>
                  <p className="text-caption text-ink-subtle">{formatDateFull(e.data)}</p>
                </div>
                <span className={cn("text-body font-semibold", Number(e.valor) >= 0 ? "text-success" : "text-danger")}>
                  {Number(e.valor) >= 0 ? "+" : "−"} {formatBRL(Math.abs(Number(e.valor)))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onDelete}
        className="w-full text-caption text-danger flex items-center justify-center gap-1 py-2">
        <Trash2 size={14} /> Excluir objetivo
      </button>
    </div>
  );
}
