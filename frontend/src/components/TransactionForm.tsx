"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { parseBRL, formatBRNumber, todayISO } from "@/lib/format";
import type { Category, TransactionRow } from "@/lib/types";

export type TransactionDraft = {
  tipo: "gasto" | "entrada";
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  data: string;       // YYYY-MM-DD
  origem: TransactionRow["origem"];
};

interface Props {
  categorias: Category[];
  inicial?: Partial<TransactionDraft>;
  suggestion?: boolean;      // true quando os valores vieram da IA
  onSubmit: (draft: TransactionDraft) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
}

export function TransactionForm({
  categorias, inicial, suggestion, onSubmit,
  submitLabel = "Salvar", cancelHref,
}: Props) {
  const [tipo, setTipo]           = useState<"gasto" | "entrada">(inicial?.tipo ?? "gasto");
  const [valorStr, setValorStr]   = useState<string>(inicial?.valor ? formatBRNumber(inicial.valor) : "");
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [data, setData]           = useState(inicial?.data ?? todayISO());
  const [erro, setErro]           = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (inicial?.tipo)         setTipo(inicial.tipo);
    if (inicial?.valor)        setValorStr(formatBRNumber(inicial.valor));
    if (inicial?.categoria_id) setCategoriaId(inicial.categoria_id);
    if (inicial?.descricao)    setDescricao(inicial.descricao);
    if (inicial?.data)         setData(inicial.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial?.valor, inicial?.categoria_id, inicial?.tipo, inicial?.descricao, inicial?.data]);

  const catsAtivas = useMemo(() => categorias.filter((c) => c.ativa), [categorias]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const valor = parseBRL(valorStr);
    if (valor <= 0) { setErro("Informe um valor maior que zero."); return; }
    setErro(null); setSaving(true);
    try {
      await onSubmit({
        tipo,
        valor,
        categoria_id: categoriaId,
        descricao: descricao.trim() || null,
        data,
        origem: inicial?.origem ?? "manual",
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {suggestion && (
        <div className="flex items-center gap-2 rounded-md bg-brand/10 px-3 py-2 text-bodysm text-brand">
          <Sparkles size={16} /> Sugerido pela IA — revise antes de confirmar.
        </div>
      )}

      {/* Toggle gasto/entrada */}
      <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-1">
        <ToggleTipo active={tipo === "gasto"}   tone="danger"  label="Gasto"   onClick={() => setTipo("gasto")} />
        <ToggleTipo active={tipo === "entrada"} tone="success" label="Entrada" onClick={() => setTipo("entrada")} />
      </div>

      {/* Valor */}
      <label className="block">
        <span className="text-bodysm text-ink-muted font-medium">Valor (R$)</span>
        <input
          inputMode="decimal"
          value={valorStr}
          onChange={(e) => setValorStr(e.target.value)}
          placeholder="0,00"
          className={cn(
            "mt-1.5 h-14 w-full rounded-md bg-surface-muted px-4 text-display text-ink text-right",
            "outline-none border border-transparent focus:border-brand focus:bg-surface",
            "transition-colors duration-base ease-apple",
          )}
        />
      </label>

      {/* Categoria: grid de chips */}
      <div>
        <span className="text-bodysm text-ink-muted font-medium">Categoria</span>
        <div className="mt-2 grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
          {catsAtivas.map((c) => {
            const active = c.id === categoriaId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoriaId(c.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md p-2 aspect-square",
                  "transition-colors duration-base ease-apple",
                  active ? "bg-brand/10 text-brand border border-brand/40"
                         : "bg-surface-muted text-ink-muted border border-transparent hover:text-ink",
                )}
              >
                <CategoryIcon name={c.icone} size={20} strokeWidth={1.75} />
                <span className="text-caption text-center truncate w-full">{c.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Descrição */}
      <Input
        name="descricao"
        label="Descrição (opcional)"
        placeholder="Ex.: Mercado da esquina"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      {/* Data */}
      <Input
        name="data"
        label="Data"
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      {erro && <p className="text-caption text-danger">{erro}</p>}

      <div className="flex gap-2">
        {cancelHref && (
          <Button type="button" variant="secondary" size="lg" className="flex-1"
            onClick={() => history.back()}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ToggleTipo({
  active, tone, label, onClick,
}: { active: boolean; tone: "danger" | "success"; label: string; onClick: () => void }) {
  const bg = active ? (tone === "danger" ? "bg-danger/15 text-danger" : "bg-success/15 text-success") : "text-ink-muted";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn("h-11 rounded-md font-semibold transition-colors duration-base ease-apple", bg)}
    >
      {label}
    </motion.button>
  );
}
