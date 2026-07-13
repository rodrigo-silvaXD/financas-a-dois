"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, List, Plus, Heart, User } from "lucide-react";
import { cn } from "@/lib/cn";

// Ordem visual: destaque no centro.
const sideItems = [
  { href: "/",        label: "Início",  icon: Home },
  { href: "/extrato", label: "Extrato", icon: List },
] as const;

const sideItemsRight = [
  { href: "/casal",  label: "Casal",  icon: Heart },
  { href: "/perfil", label: "Perfil", icon: User  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 safe-bottom pointer-events-none">
      <div className="relative mx-auto max-w-md">
        {/* barra de fundo */}
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md border-t border-hairline">
          <ul className="grid grid-cols-5 items-end px-2 pt-2 pb-2">
            {sideItems.map((it) => <NavSlot key={it.href} {...it} active={isActive(it.href)} />)}
            <li /> {/* espaço reservado pro FAB central */}
            {sideItemsRight.map((it) => <NavSlot key={it.href} {...it} active={isActive(it.href)} />)}
          </ul>
        </div>

        {/* FAB destacado — flutua sobre a barra */}
        <Link
          href="/novo"
          aria-label="Adicionar"
          className={cn(
            "pointer-events-auto absolute left-1/2 -top-5 -translate-x-1/2",
            "flex h-14 w-14 items-center justify-center rounded-pill",
            "bg-brand text-brand-ink shadow-md",
            "transition-transform duration-base ease-apple",
            "active:scale-95",
          )}
        >
          <motion.span whileTap={{ scale: 0.9 }} transition={{ duration: 0.18 }}>
            <Plus size={28} strokeWidth={2.4} />
          </motion.span>
        </Link>
      </div>
    </nav>
  );
}

function NavSlot({
  href, label, icon: Icon, active,
}: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <li className="flex flex-col items-center">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md",
          "transition-colors duration-base ease-apple",
          active ? "text-brand" : "text-ink-subtle hover:text-ink",
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.1 : 1.75} />
        <span className="text-caption">{label}</span>
        {active && (
          <motion.span
            layoutId="nav-dot"
            className="absolute -top-0.5 h-1 w-1 rounded-full bg-brand"
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
          />
        )}
      </Link>
    </li>
  );
}
