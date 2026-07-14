"use client";

import Link from "next/link";
import { Camera, Sparkles, Pencil } from "lucide-react";
import { TopBar, Card } from "@/components/ui";

const opts = [
  { href: "/novo/manual", icon: Pencil,   title: "Manual",     desc: "Preencher os campos você mesmo." },
  { href: "/novo/texto",  icon: Sparkles, title: "Por texto",  desc: "Digite ou fale e a IA extrai." },
  { href: "/novo/foto",   icon: Camera,   title: "Por foto",   desc: "Fotografe o recibo e deixe a IA ler." },
];

export default function NovoHub() {
  return (
    <main>
      <TopBar title="Adicionar" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 space-y-4">
        <p className="text-body text-ink-muted">Como você quer registrar?</p>
        {opts.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card interactive className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-heading text-ink">{title}</p>
                <p className="text-bodysm text-ink-muted">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
