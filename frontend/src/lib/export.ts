import { supabase } from "./supabase";
import { formatBRL } from "./format";

type TxRow = {
  data: string;
  tipo: "gasto" | "entrada";
  valor: number;
  descricao: string | null;
  origem: string;
  categoria: { nome: string } | null;
};

export type Periodo = { inicio: string; fim: string };

export async function fetchParaExport(userId: string, p: Periodo): Promise<TxRow[]> {
  const { data } = await supabase.from("transactions")
    .select("data, tipo, valor, descricao, origem, categoria:categories(nome)")
    .eq("user_id", userId)
    .gte("data", p.inicio).lte("data", p.fim)
    .order("data", { ascending: true });
  return (data ?? []) as unknown as TxRow[];
}

// ── CSV com BOM UTF-8 (Excel lê acentos corretamente).
export function baixarCsv(rows: TxRow[], filename: string) {
  const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Origem"];
  const lines = [header.join(";")];
  for (const r of rows) {
    lines.push([
      r.data,
      r.tipo,
      r.categoria?.nome ?? "",
      (r.descricao ?? "").replace(/;/g, ","),
      r.valor.toString().replace(".", ","),
      r.origem,
    ].join(";"));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

// ── XLSX real via sheetjs (dynamic import — não engorda o bundle base).
export async function baixarXlsx(rows: TxRow[], filename: string) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => ({
    Data: r.data, Tipo: r.tipo, Categoria: r.categoria?.nome ?? "",
    Descrição: r.descricao ?? "", Valor: r.valor, Origem: r.origem,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Extrato");
  XLSX.writeFile(wb, filename);
}

// ── PDF via jsPDF + autoTable (dynamic import).
export async function baixarPdf(rows: TxRow[], p: Periodo, filename: string) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  // jspdf-autotable exporta `default` (função) e adiciona `lastAutoTable` no doc.
  const autoTable = (autoTableMod as unknown as { default?: (d: unknown, opts: unknown) => void }).default
    ?? (autoTableMod as unknown as (d: unknown, opts: unknown) => void);
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Extrato — Finanças a Dois", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Período: ${p.inicio} a ${p.fim}`, 14, 27);

  // Totais
  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const gastos = rows.filter((r) => r.tipo === "gasto").reduce((s, r) => s + Number(r.valor), 0);
  doc.text(`Entradas: ${formatBRL(entradas)}`, 14, 34);
  doc.text(`Saídas:   ${formatBRL(gastos)}`, 14, 40);
  doc.text(`Saldo:    ${formatBRL(entradas - gastos)}`, 14, 46);

  // Totais por categoria
  const porCat = new Map<string, number>();
  for (const r of rows) if (r.tipo === "gasto") {
    const k = r.categoria?.nome ?? "Sem categoria";
    porCat.set(k, (porCat.get(k) ?? 0) + Number(r.valor));
  }
  const catRows = Array.from(porCat).sort((a, b) => b[1] - a[1])
    .map(([nome, total]) => [nome, formatBRL(total)]);

  autoTable(doc, {
    startY: 54,
    head: [["Categoria", "Total"]],
    body: catRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 95, 168] },   // #4C5FA8 brand
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [["Data", "Tipo", "Categoria", "Descrição", "Valor"]],
    body: rows.map((r) => [
      r.data, r.tipo, r.categoria?.nome ?? "—",
      r.descricao ?? "—", formatBRL(Number(r.valor)),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 95, 168] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
