"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, CurrencyInput, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatBRL, todayISO } from "@/lib/format";
import type { Category, TransactionRow } from "@/lib/types";

export type TransactionDraft = {
  tipo: "gasto" | "entrada";
  valor: number;               // valor por parcela (não o total quando parcelado)
  categoria_id: string | null;
  descricao: string | null;
  data: string;                // YYYY-MM-DD — data da 1ª parcela
  origem: TransactionRow["origem"];
  parcelas?: number;           // >1 => cria N linhas nos meses seguintes
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
  const [valor, setValor]         = useState<number>(inicial?.valor ?? 0);
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [data, setData]           = useState(inicial?.data ?? todayISO());
  const [parcelado, setParcelado] = useState(false);
  const [parcelasStr, setParcelasStr] = useState("2");
  const [erro, setErro]           = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (inicial?.tipo)         setTipo(inicial.tipo);
    if (inicial?.valor)        setValor(inicial.valor);
    if (inicial?.categoria_id) setCategoriaId(inicial.categoria_id);
    if (inicial?.descricao)    setDescricao(inicial.descricao);
    if (inicial?.data)         setData(inicial.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial?.valor, inicial?.categoria_id, inicial?.tipo, inicial?.descricao, inicial?.data]);

  const catsAtivas = useMemo(() => categorias.filter((c) => c.ativa), [categorias]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valor <= 0) { setErro("Informe um valor maior que zero."); return; }
    setErro(null); setSaving(true);
    try {
      const parcelas = tipo === "gasto" && parcelado
        ? Math.max(2, Math.min(60, Number(parcelasStr) || 2))
        : 1;
      // Valor digitado é o TOTAL da compra parcelada — dividimos por N.
      const valorPorParcela = parcelas > 1 ? +(valor / parcelas).toFixed(2) : valor;

      await onSubmit({
        tipo,
        valor: valorPorParcela,
        categoria_id: categoriaId,
        descricao: descricao.trim() || null,
        data,
        origem: inicial?.origem ?? "manual",
        parcelas: parcelas > 1 ? parcelas : undefined,
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

      <CurrencyInput label="Valor" value={valor} onChange={setValor} large />

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

      {/* Parcelamento — só para gastos */}
      {tipo === "gasto" && (
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />
            <span className="text-bodysm text-ink">É parcelado?</span>
          </label>
          {parcelado && (
            <div className="mt-2 flex items-center gap-2">
              <input inputMode="numeric" min={2} max={60}
                value={parcelasStr} onChange={(e) => setParcelasStr(e.target.value.replace(/\D/g, ""))}
                className="h-11 w-20 rounded-md bg-surface-muted px-3 text-body text-ink text-center outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple" />
              <span className="text-bodysm text-ink-muted">
                parcelas de {formatBRL(valor / Math.max(2, Number(parcelasStr) || 2))}
              </span>
            </div>
          )}
        </div>
      )}

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
