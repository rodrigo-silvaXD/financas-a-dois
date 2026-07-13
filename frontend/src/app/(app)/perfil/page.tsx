"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, LogOut, Mail, Pencil, Repeat, Sun, Moon, Monitor,
  Tags, Target, Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/Toast";
import { Badge, BottomSheet, Button, Card, Input, TopBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { APP_VERSION } from "@/lib/app";
import {
  createFamilyWithInvite, getMyFamilyContext, findPendingInviteForEmail, acceptInvite,
  type FamilyContext, type FamilyMember,
} from "@/lib/family";
import type { Profile } from "@/lib/types";

export default function PerfilPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useTheme();

  const [prof, setProf] = useState<Profile | null>(null);
  const [fam, setFam] = useState<FamilyContext | null>(null);
  const [inviteForMe, setInviteForMe] = useState<FamilyMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, ctx, pending] = await Promise.all([
      supabase.from("profiles").select("id, nome, avatar_url").eq("id", user.id).single(),
      getMyFamilyContext(user.id),
      user.email ? findPendingInviteForEmail(user.email) : Promise.resolve(null),
    ]);
    setProf(p as Profile | null);
    setFam(ctx);
    setInviteForMe(pending);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function sair() {
    await signOut();
    router.replace("/login");
  }

  async function aceitar(m: FamilyMember) {
    if (!user) return;
    try {
      await acceptInvite(m.id, user.id);
      toast.success("Convite aceito");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao aceitar convite");
    }
  }

  return (
    <main>
      <TopBar title="Perfil" />
      <section className="mx-auto max-w-md px-4 pt-4 space-y-6">
        {/* ── Perfil ── */}
        <SectionCard>
          <div className="flex items-center gap-3">
            <Avatar url={prof?.avatar_url} nome={prof?.nome} />
            <div className="min-w-0 flex-1">
              <p className="text-heading text-ink truncate">{prof?.nome ?? "…"}</p>
              <p className="text-bodysm text-ink-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar perfil"
              className="rounded-md p-1.5 text-ink-muted hover:text-ink transition-colors duration-base ease-apple"
            >
              <Pencil size={18} />
            </button>
          </div>
        </SectionCard>

        {/* ── Família ── */}
        <div>
          <SectionTitle>Família</SectionTitle>
          <SectionCard>
            {inviteForMe && !fam ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-brand/10 p-2 text-brand"><Mail size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink">Você tem um convite pendente</p>
                    <p className="text-caption text-ink-subtle">Aceite para participar da conta do casal.</p>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={() => aceitar(inviteForMe)}>
                  Aceitar convite
                </Button>
              </div>
            ) : !fam ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-brand/10 p-2 text-brand"><Users size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink">Você ainda não tem família</p>
                    <p className="text-caption text-ink-subtle">Crie uma e convide seu parceiro(a).</p>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={() => setInviteOpen(true)}>
                  Criar família e convidar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-caption text-ink-subtle uppercase tracking-wide">{fam.family.nome}</p>
                {fam.partner ? (
                  <div className="flex items-center gap-3">
                    <Avatar url={fam.partner.avatar_url} nome={fam.partner.nome} />
                    <div className="min-w-0">
                      <p className="text-body text-ink truncate">{fam.partner.nome}</p>
                      <Badge tone="success">Ativo</Badge>
                    </div>
                  </div>
                ) : fam.pendingInvite ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface-muted text-ink-muted">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body text-ink truncate">{fam.pendingInvite.invited_email}</p>
                      <Badge tone="warning">Convite pendente</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-bodysm text-ink-muted">Sem parceiro(a) por enquanto.</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Financeiro ── */}
        <div>
          <SectionTitle>Financeiro</SectionTitle>
          <div className="space-y-2">
            <Link href="/perfil/categorias">
              <Card interactive className="flex items-center gap-3 p-4">
                <Tags size={20} className="text-ink-muted" />
                <span className="flex-1 text-body text-ink">Minhas categorias</span>
                <ChevronRight size={18} className="text-ink-subtle" />
              </Card>
            </Link>
            <Link href="/perfil/recorrentes">
              <Card interactive className="flex items-center gap-3 p-4">
                <Repeat size={20} className="text-ink-muted" />
                <span className="flex-1 text-body text-ink">Gastos recorrentes</span>
                <ChevronRight size={18} className="text-ink-subtle" />
              </Card>
            </Link>
            <Link href="/objetivos">
              <Card interactive className="flex items-center gap-3 p-4">
                <Target size={20} className="text-ink-muted" />
                <span className="flex-1 text-body text-ink">Meus objetivos</span>
                <ChevronRight size={18} className="text-ink-subtle" />
              </Card>
            </Link>
          </div>
        </div>

        {/* ── Preferências ── */}
        <div>
          <SectionTitle>Preferências</SectionTitle>
          <SectionCard>
            <p className="text-bodysm text-ink-muted mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-muted p-1">
              <ThemeChoice active={preference === "light"}  onClick={() => setPreference("light")}  icon={<Sun size={16} />}     label="Claro" />
              <ThemeChoice active={preference === "dark"}   onClick={() => setPreference("dark")}   icon={<Moon size={16} />}    label="Escuro" />
              <ThemeChoice active={preference === "system"} onClick={() => setPreference("system")} icon={<Monitor size={16} />} label="Auto" />
            </div>
          </SectionCard>
        </div>

        {/* ── Conta ── */}
        <div>
          <SectionTitle>Conta</SectionTitle>
          <Button variant="secondary" size="lg" className="w-full" onClick={sair}>
            <LogOut size={18} /> Sair
          </Button>
        </div>

        <p className="text-center text-caption text-ink-subtle pt-2 pb-4">Finanças a Dois · v{APP_VERSION}</p>
      </section>

      {/* Editar perfil */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Editar perfil">
        <EditarPerfilForm
          inicial={prof}
          onDone={async () => { setEditOpen(false); await load(); toast.success("Perfil atualizado"); }}
        />
      </BottomSheet>

      {/* Criar família + convite */}
      <BottomSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Criar família">
        <CriarFamiliaForm
          onDone={async () => { setInviteOpen(false); await load(); toast.success("Família criada"); }}
        />
      </BottomSheet>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-caption uppercase tracking-wide text-ink-subtle">{children}</h2>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <Card className="p-4">{children}</Card>;
}

function Avatar({ url, nome }: { url?: string | null; nome?: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={nome ?? "avatar"} className="h-12 w-12 rounded-pill object-cover bg-surface-muted" />
    );
  }
  const inicial = nome?.trim().charAt(0).toUpperCase() ?? "?";
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-pill bg-brand/10 text-brand text-heading">
      {inicial}
    </div>
  );
}

function ThemeChoice({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 h-10 rounded-md text-bodysm font-medium",
        "transition-colors duration-base ease-apple",
        active ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
      )}
    >
      {icon} {label}
    </button>
  );
}

function EditarPerfilForm({ inicial, onDone }: {
  inicial: Profile | null; onDone: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [nome, setNome]   = useState(inicial?.nome ?? "");
  const [avatar, setAvatar] = useState(inicial?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setErro(null);
    const { error } = await supabase.from("profiles")
      .update({ nome: nome.trim(), avatar_url: avatar.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) { setErro(error.message); return; }
    await onDone();
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Input name="nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <Input name="avatar" label="URL do avatar (opcional)" placeholder="https://…"
        value={avatar} onChange={(e) => setAvatar(e.target.value)} hint="Cole a URL de uma foto. Upload por arquivo chega no próximo passo." />
      {erro && <p className="text-caption text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>Salvar</Button>
    </form>
  );
}

function CriarFamiliaForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("Nossa Família");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setErro(null);
    try {
      await createFamilyWithInvite(user.id, nome, email);
      await onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao criar família");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={criar} className="space-y-3">
      <Input name="nome" label="Nome da família" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input
        name="email" type="email" label="E-mail do parceiro(a)" placeholder="parceiro@email.com"
        value={email} onChange={(e) => setEmail(e.target.value)} required
        hint="Ele(a) recebe o vínculo automaticamente ao criar a conta com esse e-mail."
      />
      {erro && <p className="text-caption text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>Criar e convidar</Button>
    </form>
  );
}
