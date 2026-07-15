/**
 * Paleta de cores para categorias, objetivos e badges.
 * 12 tons calibrados: distinguíveis entre si, legíveis em ambos os temas,
 * usados como accents (fill e texto). Nunca como fundo puro sem alpha.
 */

export const CATEGORY_PALETTE = [
  { hex: "#10B981", nome: "Verde" },
  { hex: "#F97316", nome: "Laranja" },
  { hex: "#3B82F6", nome: "Azul" },
  { hex: "#EF4444", nome: "Vermelho" },
  { hex: "#8B5CF6", nome: "Roxo" },
  { hex: "#EAB308", nome: "Amarelo" },
  { hex: "#EC4899", nome: "Pink" },
  { hex: "#0EA5E9", nome: "Ciano" },
  { hex: "#A855F7", nome: "Púrpura" },
  { hex: "#14B8A6", nome: "Teal" },
  { hex: "#F59E0B", nome: "Âmbar" },
  { hex: "#78716C", nome: "Pedra" },
] as const;

/** Cor default por nome comum (usado em backfill/fallback de UI). */
const DEFAULTS: Record<string, string> = {
  mercado: "#10B981", alimentacao: "#F97316", transporte: "#3B82F6",
  farmacia: "#EF4444", igreja: "#8B5CF6", casa: "#EAB308",
  aluguel: "#78716C", faculdade: "#0EA5E9", lazer: "#EC4899",
  streaming: "#A855F7", saude: "#F43F5E", academia: "#14B8A6",
  presentes: "#F59E0B", pets: "#D97706", outros: "#6B7280",
};

/** Retorna a cor default de uma categoria pelo nome; fallback pra brand. */
export function defaultColorForName(nome: string): string {
  const key = nome.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return DEFAULTS[key] ?? "#4C5FA8";
}

/** Aplica alpha em cor hex (retorna `${hex}${alphaHex}`). alpha 0..1 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `${hex}${a.toString(16).padStart(2, "0")}`;
}

