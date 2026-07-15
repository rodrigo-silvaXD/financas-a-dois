import { supabase } from "./supabase";
import { formatBRL, formatDate } from "./format";

type TxRow = {
  data: string;
  tipo: "gasto" | "entrada";
  valor: number;
  descricao: string | null;
  origem: string;
  categoria: { nome: string } | null;
};

export type Periodo = { inicio: string; fim: string };

const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual", ia_texto: "IA Texto", ia_foto: "IA Foto",
  importado: "Importado", recorrente: "Recorrente",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function fetchParaExport(userId: string, p: Periodo): Promise<TxRow[]> {
  const { data } = await supabase.from("transactions")
    .select("data, tipo, valor, descricao, origem, categoria:categories(nome)")
    .eq("user_id", userId)
    .gte("data", p.inicio).lte("data", p.fim)
    .order("data", { ascending: true });
  return (data ?? []) as unknown as TxRow[];
}

// ── CSV com BOM UTF-8 (Excel lê acentos corretamente). Datas DD/MM/YYYY, valores 1234,56.
export function baixarCsv(rows: TxRow[], filename: string) {
  const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Origem"];
  const lines = [header.join(";")];
  for (const r of rows) {
    lines.push([
      formatDate(r.data),
      cap(r.tipo),
      r.categoria?.nome ?? "Sem categoria",
      (r.descricao ?? "").replace(/;/g, ","),
      Number(r.valor).toFixed(2).replace(".", ","),
      ORIGEM_LABEL[r.origem] ?? r.origem,
    ].join(";"));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

// ── XLSX via xlsx-js-style (dynamic import) — headers coloridos + colunas formatadas.
export async function baixarXlsx(rows: TxRow[], filename: string) {
  const XLSX = await import("xlsx-js-style");

  const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Origem"];
  const body = rows.map((r) => [
    formatDate(r.data),
    cap(r.tipo),
    r.categoria?.nome ?? "Sem categoria",
    r.descricao ?? "",
    Number(r.valor),
    ORIGEM_LABEL[r.origem] ?? r.origem,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Header: fundo brand #4C5FA8, texto claro, bold.
  const headStyle = {
    fill: { fgColor: { rgb: "4C5FA8" } },
    font: { bold: true, color: { rgb: "FDFDFD" } },
    alignment: { horizontal: "center" },
  };
  for (let c = 0; c < header.length; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = headStyle;
  }
  // Coluna Valor: formato moeda R$ #.##0,00 (Excel aplica separadores do locale).
  for (let r = 1; r <= body.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 4 })];
    if (cell) { cell.z = '"R$" #,##0.00'; }
  }
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 12 },
  ];

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
  const BRAND: [number, number, number] = [76, 95, 168]; // #4C5FA8

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND);
  doc.text("Finanças a Dois", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Extrato de lançamentos", 14, 27);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Período: ${formatDate(p.inicio)} a ${formatDate(p.fim)}`, 14, 33);
  doc.setDrawColor(220);
  doc.line(14, 37, 196, 37);

  // Totais do período
  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const gastos = rows.filter((r) => r.tipo === "gasto").reduce((s, r) => s + Number(r.valor), 0);
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Entradas: ${formatBRL(entradas)}`, 14, 44);
  doc.text(`Saídas: ${formatBRL(gastos)}`, 80, 44);
  doc.setFont("helvetica", "bold");
  doc.text(`Saldo: ${formatBRL(entradas - gastos)}`, 140, 44);
  doc.setFont("helvetica", "normal");

  // Totais por categoria
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text("Totais por categoria", 14, 55);
  doc.setFont("helvetica", "normal");

  const porCat = new Map<string, number>();
  for (const r of rows) if (r.tipo === "gasto") {
    const k = r.categoria?.nome ?? "Sem categoria";
    porCat.set(k, (porCat.get(k) ?? 0) + Number(r.valor));
  }
  const catRows = Array.from(porCat).sort((a, b) => b[1] - a[1])
    .map(([nome, total]) => [nome, formatBRL(total)]);

  autoTable(doc, {
    startY: 59,
    head: [["Categoria", "Total"]],
    body: catRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND },
    alternateRowStyles: { fillColor: [246, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  // Lançamentos
  const afterCat = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos", 14, afterCat + 12);
  doc.setFont("helvetica", "normal");

  autoTable(doc, {
    startY: afterCat + 16,
    head: [["Data", "Tipo", "Categoria", "Descrição", "Valor"]],
    body: rows.map((r) => [
      formatDate(r.data), cap(r.tipo), r.categoria?.nome ?? "—",
      r.descricao ?? "—", formatBRL(Number(r.valor)),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
    alternateRowStyles: { fillColor: [246, 247, 250] },
    columnStyles: { 4: { halign: "right" } },
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
