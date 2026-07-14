"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileUp, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Badge, BottomSheet, Button, Card, TopBar } from "@/components/ui";
import { formatBRL, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  checarDuplicados, enriquecer, parseCsv, parseOfxViaApi, parsePdfViaApi, salvarLote,
  type ParsedTx, type ReviewItem,
} from "@/lib/import";
import type { Category } from "@/lib/types";

export default function ImportarPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [itens, setItens] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickCat, setPickCat] = useState<{ idx: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true).order("ordem")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, [user]);

  async function processar(file: File) {
    if (!user) return;
    setLoading(true); setErro(null); setItens([]);
    try {
      const nome = file.name.toLowerCase();
      let txs: ParsedTx[] = [];

      if (nome.endsWith(".ofx") || nome.endsWith(".qfx")) {
        const text = await file.text();
        const res = await parseOfxViaApi(text);
        txs = res.transactions;
      } else if (nome.endsWith(".csv")) {
        txs = parseCsv(await file.text());
        if (txs.length === 0) throw new Error("CSV sem colunas reconhecíveis (data, descrição, valor).");
      } else if (nome.endsWith(".pdf")) {
        const b64 = await fileToBase64(file);
        const res = await parsePdfViaApi(b64);
        txs = res.transactions;
      } else {
        throw new Error("Formato não suportado. Envie OFX, CSV ou PDF.");
      }
      if (txs.length === 0) throw new Error("Nenhuma transação encontrada no arquivo.");

      // Enrich + dup check paralelo
      const idsExternos = txs.map((t) => t.id_externo).filter((x): x is string => !!x);
      const [enriched, dup] = await Promise.all([
        enriquecer(txs, cats.map((c) => c.nome)),
        checarDuplicados(user.id, idsExternos),
      ]);

      // Nome IA → id
      const catFromName = (nome: string | null | undefined) =>
        (nome && cats.find((c) => c.nome.toLowerCase() === nome.toLowerCase())?.id) ?? null;

      const review: ReviewItem[] = enriched.map((it, i) => {
        const t = txs[i]!;
        return {
          ...t,
          via: it.via,
          category_id: it.category_id ?? catFromName(it.category_name) ?? null,
          category_name: it.category_name ?? null,
          jaImportado: !!t.id_externo && dup.has(t.id_externo),
          selecionado: !(t.id_externo && dup.has(t.id_externo)),
        };
      });
      setItens(review);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar.");
    } finally {
      setLoading(false);
    }
  }

  async function importar() {
    if (!user) return;
    setSaving(true);
    try {
      const n = await salvarLote(user.id, itens);
      toast.success(`${n} lançamento${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}`);
      router.replace("/extrato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const selCount = itens.filter((i) => i.selecionado && !i.jaImportado).length;

  return (
    <main>
      <TopBar title="Importar extrato" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 pb-8 space-y-5">
        {itens.length === 0 ? (
          <>
            <input ref={fileRef} type="file" accept=".ofx,.qfx,.csv,.pdf" className="hidden"
              onChange={(e) => e.target.files?.[0] && processar(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hairline bg-surface-muted p-8 text-ink-muted transition-colors duration-base ease-apple hover:text-ink hover:border-brand disabled:opacity-50">
              {loading ? <Sparkles size={28} className="animate-pulse" /> : <FileUp size={28} strokeWidth={1.5} />}
              <span className="text-body">
                {loading ? "Processando…" : "Toque para escolher o arquivo"}
              </span>
              <span className="text-caption text-ink-subtle">OFX · CSV · PDF · até 10MB</span>
            </button>

            {erro && <p className="text-caption text-danger">{erro}</p>}

            <div className="text-caption text-ink-subtle space-y-1">
              <p><b>OFX/QFX</b>: extraído localmente, formato padrão de bancos.</p>
              <p><b>CSV</b>: precisa ter colunas data, descrição e valor.</p>
              <p><b>PDF</b>: a IA lê o extrato. Requer conexão.</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-body text-ink">
                <span className="font-semibold">{selCount}</span> selecionadas de {itens.length}
              </p>
              <button onClick={() => { setItens([]); setErro(null); }}
                className="text-bodysm text-brand font-semibold">Refazer</button>
            </div>

            <ul className="space-y-2">
              {itens.map((it, i) => (
                <motion.li key={i}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}>
                  <Card className={cn("flex items-center gap-3 p-3", it.jaImportado && "opacity-50")}>
                    <input type="checkbox" checked={it.selecionado} disabled={it.jaImportado}
                      onChange={(e) => setItens((prev) => prev.map((x, k) => k === i ? { ...x, selecionado: e.target.checked } : x))}
                      className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-ink">{it.descricao || "—"}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-caption text-ink-subtle">{formatDateShort(it.data)}</span>
                        {it.jaImportado ? <Badge tone="neutral">Já importado</Badge>
                          : it.via === "rule" ? <Badge tone="success">Regra existente</Badge>
                          : it.via === "ia"   ? <Badge tone="warning">Sugestão IA</Badge>
                                              : <Badge tone="danger">Sem categoria</Badge>}
                        <button type="button" onClick={() => setPickCat({ idx: i })}
                          className="text-caption text-brand font-semibold">
                          {cats.find((c) => c.id === it.category_id)?.nome ?? "Escolher categoria"}
                        </button>
                      </div>
                    </div>
                    <span className={cn("text-body font-semibold shrink-0",
                      it.valor < 0 ? "text-danger" : "text-success")}>
                      {it.valor < 0 ? "−" : "+"} {formatBRL(Math.abs(it.valor))}
                    </span>
                  </Card>
                </motion.li>
              ))}
            </ul>

            <Button size="lg" className="w-full" onClick={importar} loading={saving} disabled={selCount === 0}>
              <Upload size={18} /> Importar {selCount > 0 ? `(${selCount})` : ""}
            </Button>
          </>
        )}
      </section>

      <BottomSheet open={pickCat !== null} onClose={() => setPickCat(null)} title="Escolher categoria">
        {pickCat && (
          <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {cats.map((c) => (
              <button key={c.id} type="button"
                onClick={() => {
                  setItens((prev) => prev.map((x, k) => k === pickCat.idx ? { ...x, category_id: c.id } : x));
                  setPickCat(null);
                }}
                className="rounded-md p-3 bg-surface-muted text-ink-muted hover:text-ink text-caption">
                {c.nome}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}
