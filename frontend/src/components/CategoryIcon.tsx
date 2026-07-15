"use client";

import { icons, HelpCircle, Wallet } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { withAlpha, defaultColorForName } from "@/lib/categoryColors";

// kebab-case → PascalCase (ex.: "shopping-cart" → "ShoppingCart")
function toPascal(name: string): string {
  return name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

interface Props extends LucideProps {
  name: string;   // nome kebab do Lucide, como salvo em categories.icone
}

export function CategoryIcon({ name, ...rest }: Props) {
  const key = toPascal(name) as keyof typeof icons;
  const Cmp = icons[key] ?? HelpCircle;
  return <Cmp {...rest} />;
}

/**
 * Quadrado 44px com o ícone da categoria sobre fundo tintado (13% da cor).
 * Sem cor salva, cai no default pelo nome; sem categoria, neutro com Wallet.
 */
export function CategoryAvatar({ categoria, size = 18 }: {
  categoria: { nome: string; icone: string; cor: string | null } | null;
  size?: number;
}) {
  const cor = categoria ? (categoria.cor ?? defaultColorForName(categoria.nome)) : null;
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-ink-muted shrink-0"
      style={cor ? { background: withAlpha(cor, 0.13), color: cor } : undefined}
    >
      {categoria
        ? <CategoryIcon name={categoria.icone} size={size} strokeWidth={1.75} />
        : <Wallet size={size} strokeWidth={1.75} />}
    </div>
  );
}
