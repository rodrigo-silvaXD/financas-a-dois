const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBRL(v: number): string {
  return brl.format(v);
}

/** Formatação sem símbolo pra usar em inputs. */
export function formatBRNumber(v: number): string {
  return brNum.format(v);
}

/** "1234,56" ou "R$ 1.234,56" → 1234.56. Aceita vazio. */
export function parseBRL(s: string): number {
  const cleaned = s.replace(/[^\d,]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const df = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dfShort = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dfFull  = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

export function formatDate(iso: string): string { return df.format(new Date(iso + "T12:00:00")); }
export function formatDateShort(iso: string): string { return dfShort.format(new Date(iso + "T12:00:00")); }
export function formatDateFull(iso: string): string {
  const d = dfFull.format(new Date(iso + "T12:00:00"));
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/** YYYY-MM-DD do dia atual (timezone local). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
