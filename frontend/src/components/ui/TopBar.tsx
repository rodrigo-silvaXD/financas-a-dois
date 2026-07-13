"use client";

import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

interface Props {
  title?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, showBack, rightSlot, className }: Props) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 safe-top",
        "bg-canvas/80 backdrop-blur-md border-b border-hairline",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => router.back()}
              aria-label="Voltar"
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {title && <h1 className="text-heading text-ink">{title}</h1>}
        </div>
        <div className="flex items-center gap-1">
          {rightSlot}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted transition-colors duration-base ease-apple"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
