"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { TopBar, Button } from "@/components/ui";
import { TransactionForm, type TransactionDraft } from "@/components/TransactionForm";
import { saveTransaction } from "@/lib/transactions";
import { api } from "@/lib/api";
import { parseBRL, todayISO } from "@/lib/format";
import { useToast } from "@/components/Toast";
import type { Category } from "@/lib/types";

// Tipos mínimos da Web Speech API — não existem no lib.dom por default.
type SpeechRecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: SpeechRecognitionResult) => void;
  onend: () => void;
  start(): void;
  stop(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognition;
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

// Draft final já resolvido (com categoria_id, não nome).
type ParsedDraft = {
  tipo: "gasto" | "entrada";
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  data: string;
  via: "rule" | "ia";     // origem da inferência — controla mensagem no UI
};

// Extrai o primeiro número decimal do texto (12, 12.5, 12,50, 1.234,56).
function extractValor(texto: string): number {
  const match = texto.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  return match ? parseBRL(match[0]) : 0;
}

export default function NovoTextoPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [texto, setTexto] = useState("");
  const [parsed, setParsed] = useState<ParsedDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true).order("ordem")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, [user]);

  const speechSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  function toggleRec() {
    if (!speechSupported) return;
    if (recording) { recRef.current?.stop(); return; }
    const w = window as WindowWithSpeech;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "pt-BR"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionResult) =>
      setTexto((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setRecording(false);
    rec.start(); recRef.current = rec; setRecording(true);
  }

  async function analisar() {
    if (!texto.trim()) return;
    setLoading(true); setErro(null);
    try {
      // 1) Rule first — economiza chamada de IA se o pattern já é conhecido.
      const rule = await api<{ category_id: string | null }>(
        `/ai/suggest-category?descricao=${encodeURIComponent(texto)}`,
      );
      if (rule.category_id) {
        setParsed({
          tipo: "gasto",
          valor: extractValor(texto),
          categoria_id: rule.category_id,
          descricao: texto.trim(),
          data: todayISO(),
          via: "rule",
        });
        return;
      }

      // 2) Fallback: IA parse-text.
      const catNames = cats.map((c) => c.nome);
      const res = await api<{
        valor: number; tipo: "gasto" | "entrada";
        categoria_nome: string | null; descricao: string | null; data: string;
      }>("/ai/parse-text", {
        method: "POST",
        body: JSON.stringify({ texto, categorias: catNames, data_hoje: todayISO() }),
      });

      const catId =
        (res.categoria_nome &&
          cats.find((c) => c.nome.toLowerCase() === res.categoria_nome!.toLowerCase())?.id) ?? null;

      setParsed({
        tipo: res.tipo,
        valor: res.valor,
        categoria_id: catId,
        descricao: res.descricao,
        data: res.data,
        via: "ia",
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(draft: TransactionDraft) {
    if (!user) return;
    await saveTransaction(user.id, { ...draft, origem: "ia_texto" });
    toast.success("Salvo");
    router.replace("/");
  }

  return (
    <main>
      <TopBar title="Adicionar por texto" showBack />
      <section className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-4">
        {!parsed ? (
          <>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: gastei 45 no mercado ontem"
              rows={4}
              className="w-full rounded-md bg-surface-muted p-4 text-body text-ink placeholder:text-ink-subtle outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple resize-none"
            />
            <div className="flex gap-2">
              {speechSupported && (
                <Button type="button" variant="secondary" size="lg" onClick={toggleRec}
                  className={recording ? "text-danger" : ""}>
                  <Mic size={18} /> {recording ? "Parar" : "Falar"}
                </Button>
              )}
              <Button type="button" size="lg" className="flex-1" loading={loading}
                onClick={analisar} disabled={!texto.trim()}>
                <Send size={16} /> Analisar
              </Button>
            </div>
            <div className="flex items-start gap-2 text-caption text-ink-subtle">
              <Sparkles size={14} className="mt-0.5" />
              <p>Se você já registrou algo parecido, uso a categoria aprendida sem chamar a IA. Senão, a IA extrai tudo. Você revisa antes de salvar.</p>
            </div>
            {erro && <p className="text-caption text-danger">{erro}</p>}
          </>
        ) : (
          <TransactionForm
            categorias={cats}
            suggestion
            inicial={{
              tipo: parsed.tipo,
              valor: parsed.valor,
              categoria_id: parsed.categoria_id,
              descricao: parsed.descricao,
              data: parsed.data,
              origem: "ia_texto",
            }}
            onSubmit={onConfirm}
            submitLabel="Confirmar e salvar"
            cancelHref="/novo/texto"
          />
        )}
      </section>
    </main>
  );
}
