"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Button, Card, Input, TopBar } from "@/components/ui";
import { todayISO } from "@/lib/format";
import { baixarCsv, baixarPdf, baixarXlsx, fetchParaExport } from "@/lib/export";

function inicioDoMes(): string {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function ExportarPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(todayISO());
  const [gerando, setGerando] = useState<"csv" | "xlsx" | "pdf" | null>(null);

  async function baixar(fmt: "csv" | "xlsx" | "pdf") {
    if (!user) return;
    setGerando(fmt);
    try {
      const rows = await fetchParaExport(user.id, { inicio, fim });
      if (rows.length === 0) { toast.error("Nenhum lançamento no período"); return; }
      const name = `financas-a-dois_${inicio}_a_${fim}.${fmt}`;
      if (fmt === "csv") baixarCsv(rows, name);
      else if (fmt === "xlsx") await baixarXlsx(rows, name);
      else await baixarPdf(rows, { inicio, fim }, name);
      toast.success("Download iniciado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setGerando(null);
    }
  }

  return (
    <main>
      <TopBar title="Exportar dados" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 pb-8 space-y-5">
        <Card>
          <h3 className="text-heading text-ink mb-4">Período</h3>
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <Input name="inicio" label="Início" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <Input name="fim"    label="Fim"    type="date" value={fim}    onChange={(e) => setFim(e.target.value)} />
          </div>
        </Card>

        <div className="space-y-3">
          <ExportRow icon={<FileType size={20} />} title="CSV" desc="Arquivo simples, abre no Excel ou Sheets."
            loading={gerando === "csv"} onClick={() => baixar("csv")} />
          <ExportRow icon={<FileSpreadsheet size={20} />} title="Excel (.xlsx)" desc="Planilha nativa do Excel."
            loading={gerando === "xlsx"} onClick={() => baixar("xlsx")} />
          <ExportRow icon={<FileText size={20} />} title="PDF" desc="Relatório com totais por categoria."
            loading={gerando === "pdf"} onClick={() => baixar("pdf")} />
        </div>
      </section>
    </main>
  );
}

function ExportRow({ icon, title, desc, loading, onClick }: {
  icon: React.ReactNode; title: string; desc: string;
  loading: boolean; onClick: () => void;
}) {
  return (
    <Card interactive className="flex items-center gap-3 p-4">
      <div className="rounded-md bg-brand/10 p-2 text-brand">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-body text-ink">{title}</p>
        <p className="text-caption text-ink-subtle">{desc}</p>
      </div>
      <Button size="md" variant="secondary" onClick={onClick} loading={loading} loadingLabel="Exportando…">
        <Download size={16} />
      </Button>
    </Card>
  );
}
