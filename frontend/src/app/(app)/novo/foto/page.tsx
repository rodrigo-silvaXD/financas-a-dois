"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { TopBar, Button } from "@/components/ui";
import { TransactionForm, type TransactionDraft } from "@/components/TransactionForm";
import { saveTransaction } from "@/lib/transactions";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { useToast } from "@/components/Toast";
import type { Category } from "@/lib/types";

type Parsed = {
  valor_total: number;
  itens: { nome: string; valor: number }[] | null;
  estabelecimento: string | null;
  data: string | null;
};

export default function NovoFotoPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("categories").select("*").eq("user_id", user.id).eq("ativa", true).order("ordem")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, [user]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErro("Imagem acima de 8MB."); return; }

    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("Falha ao ler imagem."));
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setLoading(true); setErro(null);
    try {
      const base64 = dataUrl.split(",")[1];
      const media_type = file.type || "image/jpeg";
      const res = await api<Parsed>("/ai/parse-receipt", {
        method: "POST",
        body: JSON.stringify({ image_base64: base64, media_type, data_hoje: todayISO() }),
      });
      setParsed(res);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na análise da imagem.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(draft: TransactionDraft) {
    if (!user) return;
    await saveTransaction(user.id, { ...draft, origem: "ia_foto" });
    toast.success("Salvo");
    router.replace("/");
  }

  return (
    <main>
      <TopBar title="Adicionar por foto" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 pb-8 space-y-5">
        {!parsed ? (
          <>
            <label className="block">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPick}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hairline bg-surface-muted p-8 text-ink-muted transition-colors duration-base ease-apple hover:text-ink hover:border-brand"
              >
                <Camera size={28} strokeWidth={1.5} />
                <span className="text-body">Toque para fotografar ou escolher</span>
                <span className="text-caption text-ink-subtle">JPG ou PNG · até 8MB</span>
              </button>
            </label>

            {preview && (
              <div className="rounded-md overflow-hidden border border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Recibo" className="w-full max-h-64 object-contain bg-surface" />
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-bodysm text-brand">
                <Sparkles size={16} className="animate-pulse" /> Analisando recibo…
              </div>
            )}
            {erro && (
              <>
                <p className="text-caption text-danger">{erro}</p>
                <Button variant="secondary" size="lg" className="w-full" onClick={() => router.replace("/novo/manual")}>
                  Preencher manualmente
                </Button>
              </>
            )}
          </>
        ) : (
          <TransactionForm
            categorias={cats}
            suggestion
            inicial={{
              tipo: "gasto",
              valor: parsed.valor_total,
              categoria_id: null,      // usuário escolhe — a IA de recibo não decide categoria
              descricao: parsed.estabelecimento,
              data: parsed.data || todayISO(),
              origem: "ia_foto",
            }}
            onSubmit={onConfirm}
            submitLabel="Confirmar e salvar"
            cancelHref="/novo/foto"
          />
        )}
      </section>
    </main>
  );
}
