"use client";

import { icons, HelpCircle } from "lucide-react";
import type { LucideProps } from "lucide-react";

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
