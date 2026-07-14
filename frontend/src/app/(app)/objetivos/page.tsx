"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Trash2 } from "lucide-react";
import { SkeletonCard } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { BottomSheet, Button, EmptyState, Input, TopBar } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GoalCard } from "@/components/GoalCard";
import { formatBRL, formatDateFull, parseBRL } from "@/lib/format";
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
        {loading ? (
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
  const [valorStr, setValorStr] = useState("");
  const [icone, setIcone] = useState("target");
  const [cor, setCor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const meta = parseBRL(valorStr);
    if (!nome.trim() || meta <= 0) { setErro("Preencha nome e meta > 0."); return; }
    setSaving(true);
    try {
      await createGoal(user.id, { nome: nome.trim(), valor_meta: meta, icone, cor });
      await onDone();
    } catch (err) { setErro(err instanceof Error ? err.message : "Falha"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input name="nome" label="Nome" placeholder="Ex.: Casamento" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <label className="block">
        <span className="text-bodysm text-ink-muted font-medium">Valor meta (R$)</span>
        <input inputMode="decimal" value={valorStr} onChange={(e) => setValorStr(e.target.value)} placeholder="0,00"
          className="mt-1.5 h-12 w-full rounded-md bg-surface-muted px-4 text-body text-ink outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple text-right" />
      </label>
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
      <Input name="cor" label="Cor (hex, opcional)" placeholder="#4C5FA8"
        value={cor ?? ""} onChange={(e) => setCor(e.target.value || null)} />
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
  const [valorStr, setValorStr] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const pct = goal.valor_meta > 0 ? Math.min(100, (Number(goal.valor_atual) / Number(goal.valor_meta)) * 100) : 0;

  async function aportar(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const valor = parseBRL(valorStr);
    if (valor === 0) return;
    setSaving(true);
    try {
      await addGoalEntry(goal.id, user.id, valor, descricao.trim() || null);
      setValorStr(""); setDescricao("");
      await onAdded();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption text-ink-subtle uppercase tracking-wide">Progresso</p>
        <p className="text-display text-ink">{formatBRL(Number(goal.valor_atual))}</p>
        <p className="text-bodysm text-ink-muted">de {formatBRL(Number(goal.valor_meta))} · {Math.round(pct)}%</p>
      </div>

      <form onSubmit={aportar} className="space-y-3">
        <label className="block">
          <span className="text-bodysm text-ink-muted font-medium">Novo aporte (R$)</span>
          <input inputMode="decimal" value={valorStr} onChange={(e) => setValorStr(e.target.value)} placeholder="0,00"
            className="mt-1.5 h-14 w-full rounded-md bg-surface-muted px-4 text-heading text-ink text-right outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple" />
        </label>
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
