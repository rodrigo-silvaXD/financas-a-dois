"use client";

import Link from "next/link";
import { Camera, MicVocal, Pencil } from "lucide-react";
import { TopBar, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

// Ordem por velocidade real de uso: foto (mais rápido em recibo físico) →
// texto (mais rápido pra descrever verbalmente) → manual (fallback preciso).
const opts = [
  {
    href: "/novo/foto",
    icon: Camera,
    title: "Por foto",
    desc: "Fotografe o recibo, a IA lê o valor.",
    badge: "Mais rápido",
    tone: "brand" as const,
  },
  {
    href: "/novo/texto",
    icon: MicVocal,
    title: "Por texto ou voz",
    desc: "Digite ou fale, tipo \"gastei 45 no mercado\".",
    tone: "success" as const,
  },
  {
    href: "/novo/manual",
    icon: Pencil,
    title: "Manual",
    desc: "Preencha os campos, sem IA.",
    tone: "neutral" as const,
  },
];

const toneClass: Record<"brand" | "success" | "neutral", { bg: string; text: string; badge: string }> = {
  brand:   { bg: "bg-brand/10",   text: "text-brand",   badge: "bg-brand text-brand-ink" },
  success: { bg: "bg-success/10", text: "text-success", badge: "bg-success text-white" },
  neutral: { bg: "bg-surface-muted", text: "text-ink-muted", badge: "" },
};

export default function NovoHub() {
  return (
    <main>
      <TopBar title="Adicionar" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 pb-8">
        <p className="text-body text-ink-muted mb-6">Como você quer registrar?</p>

        <div className="grid gap-4">
          {opts.map(({ href, icon: Icon, title, desc, badge, tone }) => {
            const t = toneClass[tone];
            return (
              <Link key={href} href={href} className="block">
                <Card interactive className="flex items-center gap-4 p-5">
                  <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", t.bg, t.text)}>
                    <Icon size={26} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-heading text-ink font-semibold">{title}</p>
                      {badge && (
                        <span className={cn("rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", t.badge)}>
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-bodysm text-ink-muted mt-1 leading-relaxed">{desc}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
