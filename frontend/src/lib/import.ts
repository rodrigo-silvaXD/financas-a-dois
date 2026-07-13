import { supabase } from "./supabase";
import { normalize } from "./normalize";
import { api } from "./api";
import { todayISO } from "./format";

export type ParsedTx = {
  data: string;
  descricao: string;
  valor: number;              // sinal preservado: negativo = gasto
  id_externo: string | null;
};

export type ReviewItem = ParsedTx & {
  via: "rule" | "ia" | "none";
  category_id: string | null;
  category_name: string | null;
  jaImportado: boolean;
  selecionado: boolean;
};

// ── CSV parser genérico
//    Aceita separador ; ou , (auto-detect pela linha 1).
//    Cabeçalho obrigatório. Reconhece colunas por sinônimos comuns.
export function parseCsv(text: string): ParsedTx[] {
  const clean = text.replace(/^﻿/, "").trim();
  const linhas = clean.split(/\r?\n/);
  if (linhas.length < 2) return [];
  const primeira = linhas[0] ?? "";
  const sep = primeira.split(";").length > primeira.split(",").length ? ";" : ",";
  const cols = primeira.split(sep).map((c) => normalize(c));

  const idx = {
    data: cols.findIndex((c) => /data|date|lancamento/.test(c)),
    descricao: cols.findIndex((c) => /descric|historic|memo|titulo|estab/.test(c)),
    valor: cols.findIndex((c) => /valor|amount|montante/.test(c)),
    id: cols.findIndex((c) => /id|fitid|codigo/.test(c)),
  };
  if (idx.data < 0 || idx.descricao < 0 || idx.valor < 0) return [];

  const out: ParsedTx[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cells = (linhas[i] ?? "").split(sep);
    if (cells.length < cols.length) continue;
    const dataStr = (cells[idx.data] ?? "").trim();
    const data = normalizarData(dataStr);
    if (!data) continue;
    const descricao = (cells[idx.descricao] ?? "").trim();
    const valor = parseValor(cells[idx.valor] ?? "");
    if (!Number.isFinite(valor)) continue;
    const id_externo = idx.id >= 0 ? (cells[idx.id] ?? "").trim() || null : null;
    out.push({ data, descricao, valor, id_externo });
  }
  return out;
}

// dd/mm/yyyy ou yyyy-mm-dd → YYYY-MM-DD
function normalizarData(s: string): string | null {
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

// "1.234,56" ou "1234.56" → 1234.56
function parseValor(s: string): number {
  const trimmed = s.trim().replace(/[^\d,.\-]/g, "");
  const semMil = trimmed.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Number(semMil);
}

// ── Confere quais id_externo já existem
export async function checarDuplicados(userId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase.from("transactions")
    .select("id_externo").eq("user_id", userId).in("id_externo", ids);
  return new Set((data ?? []).map((r) => r.id_externo as string));
}

// ── Enrich via backend
export async function enriquecer(txs: ParsedTx[], categorias: string[]) {
  const itens = txs.map((t) => ({ descricao: t.descricao, data: t.data, valor: t.valor }));
  const res = await api<{ itens: {
    descricao: string; data: string; valor: number;
    via: "rule" | "ia" | "none";
    category_id?: string; category_name?: string;
  }[] }>("/import/enrich", {
    method: "POST",
    body: JSON.stringify({ itens, categorias }),
  });
  return res.itens;
}

// ── Salva batch + aprendizado
export async function salvarLote(userId: string, itens: ReviewItem[]) {
  const selecionados = itens.filter((i) => i.selecionado && !i.jaImportado);
  if (selecionados.length === 0) return 0;

  const rows = selecionados.map((i) => ({
    user_id: userId,
    tipo: i.valor < 0 ? "gasto" : "entrada",
    valor: Math.abs(i.valor),
    categoria_id: i.category_id,
    descricao: i.descricao,
    data: i.data,
    origem: "importado",
    id_externo: i.id_externo,
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);

  // Aprende: para cada linha com categoria + descrição, upsert em category_rules
  for (const i of selecionados) {
    if (!i.category_id || !i.descricao) continue;
    const pattern = normalize(i.descricao);
    if (!pattern) continue;
    const { data: existing } = await supabase.from("category_rules")
      .select("id, vezes_usado").eq("user_id", userId).eq("pattern", pattern).maybeSingle();
    if (existing) {
      await supabase.from("category_rules")
        .update({ vezes_usado: existing.vezes_usado + 1, category_id: i.category_id })
        .eq("id", existing.id);
    } else {
      await supabase.from("category_rules").insert({
        user_id: userId, pattern, category_id: i.category_id,
      });
    }
  }

  return rows.length;
}

// ── PDF via IA
export async function parsePdfViaApi(base64: string) {
  return api<{ transactions: ParsedTx[] }>("/import/parse-pdf", {
    method: "POST",
    body: JSON.stringify({ pdf_base64: base64, data_hoje: todayISO() }),
  });
}

// ── OFX via backend (parse local no server)
export async function parseOfxViaApi(text: string) {
  return api<{ transactions: ParsedTx[] }>("/import/parse-ofx", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
