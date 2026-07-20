"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download, Fingerprint, LogOut, Mail, Pencil, Repeat, Sun, Moon, Monitor,
  Tags, Target, Upload, Users,
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
  updatePendingInvite, cancelPendingInvite,
  type FamilyContext, type FamilyMember,
} from "@/lib/family";
import {
  disableBiometric, platformAuthAvailable, registerBiometric,
} from "@/lib/webauthn";
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
  const [editInviteOpen, setEditInviteOpen] = useState(false);

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
      <TopBar title="Menu" />
      <section className="mx-auto max-w-md px-5 pt-4 space-y-6">
        {/* ── Você ── */}
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-ink-muted">
                        <Mail size={18} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-body text-ink truncate">{fam.pendingInvite.invited_email}</p>
                        <Badge tone="warning">Convite pendente</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="secondary" onClick={() => setEditInviteOpen(true)}>
                        Alterar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await cancelPendingInvite();
                            toast.success("Convite cancelado");
                            await load();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Falha ao cancelar");
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : fam.family.criado_por === user?.id ? (
                  <div className="space-y-3">
                    <p className="text-bodysm text-ink-muted">Sem parceiro(a) por enquanto.</p>
                    <Button size="lg" className="w-full" onClick={() => setEditInviteOpen(true)}>
                      Convidar parceiro(a)
                    </Button>
                  </div>
                ) : (
                  <p className="text-bodysm text-ink-muted">Sem parceiro(a) por enquanto.</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Atalhos (grid visual tipo app drawer) ── */}
        <div>
          <SectionTitle>Atalhos</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <ShortcutTile href="/perfil/categorias" icon={Tags}   label="Categorias"  tone="brand"   />
            <ShortcutTile href="/perfil/recorrentes" icon={Repeat} label="Recorrentes" tone="brand"   />
            <ShortcutTile href="/objetivos"          icon={Target} label="Objetivos"   tone="success" />
            <ShortcutTile href="/importar"           icon={Upload} label="Importar"    tone="warning" />
            <ShortcutTile href="/exportar"           icon={Download} label="Exportar"  tone="warning" />
          </div>
        </div>

        {/* ── Ajustes (tema + biometria juntos) ── */}
        <div>
          <SectionTitle>Ajustes</SectionTitle>
          <SectionCard>
            <div className="space-y-5">
              <div>
                <p className="text-bodysm text-ink-muted mb-2">Tema</p>
                <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-muted p-1">
                  <ThemeChoice active={preference === "light"}  onClick={() => setPreference("light")}  icon={<Sun size={16} />}     label="Claro" />
                  <ThemeChoice active={preference === "dark"}   onClick={() => setPreference("dark")}   icon={<Moon size={16} />}    label="Escuro" />
                  <ThemeChoice active={preference === "system"} onClick={() => setPreference("system")} icon={<Monitor size={16} />} label="Auto" />
                </div>
              </div>
              <div className="pt-4 border-t border-hairline">
                <BiometriaControl />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Sair ── */}
        <Button variant="secondary" size="lg" className="w-full" onClick={sair}>
          <LogOut size={18} /> Sair
        </Button>

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

      {/* Reenviar / alterar convite pendente */}
      <BottomSheet
        open={editInviteOpen}
        onClose={() => setEditInviteOpen(false)}
        title={fam?.pendingInvite ? "Reenviar convite" : "Convidar parceiro(a)"}
      >
        <ReenviarConviteForm
          emailAtual={fam?.pendingInvite?.invited_email ?? ""}
          onDone={async () => { setEditInviteOpen(false); await load(); toast.success("Convite atualizado"); }}
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

function ShortcutTile({
  href, icon: Icon, label, tone,
}: { href: string; icon: typeof Tags; label: string; tone: "brand" | "success" | "warning" }) {
  const toneClass =
    tone === "brand"   ? "bg-brand/10 text-brand" :
    tone === "success" ? "bg-success/10 text-success" :
                         "bg-warning/10 text-warning";
  return (
    <Link href={href}>
      <Card interactive className="flex flex-col items-center justify-center gap-2 aspect-square p-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", toneClass)}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="text-caption text-ink text-center">{label}</span>
      </Card>
    </Link>
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

function ReenviarConviteForm({ emailAtual, onDone }: {
  emailAtual: string; onDone: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState(emailAtual);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { setEmail(emailAtual); }, [emailAtual]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      setErro("Informe um email válido."); return;
    }
    if (user?.email && emailNorm === user.email.toLowerCase()) {
      setErro("Use o email do parceiro(a), não o seu."); return;
    }
    setSaving(true); setErro(null);
    try {
      await updatePendingInvite(emailNorm);
      await onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao atualizar convite");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Input
        name="email" type="email" label="Email do parceiro(a)" placeholder="parceiro@email.com"
        value={email} onChange={(e) => setEmail(e.target.value)} required
        hint="Ao se cadastrar com esse email, ele(a) vira parceiro automaticamente. Se já tem conta, vira parceiro na hora."
      />
      {erro && <p className="text-caption text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>Salvar</Button>
    </form>
  );
}

function BiometriaControl() {
  const { user } = useAuth();
  const toast = useToast();
  const [ativa, setAtiva] = useState<boolean>(!!user?.user_metadata?.biometria_ativa);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAtiva(!!user?.user_metadata?.biometria_ativa);
  }, [user?.user_metadata?.biometria_ativa]);

  useEffect(() => {
    platformAuthAvailable().then(setSupported);
  }, []);

  async function ativar() {
    setBusy(true);
    try {
      await registerBiometric();
      setAtiva(true);
      toast.success("Biometria ativada neste aparelho");
    } catch {
      toast.error("Não foi possível ativar a biometria");
    } finally {
      setBusy(false);
    }
  }

  async function reiniciar() {
    setBusy(true);
    try {
      await disableBiometric();
      await registerBiometric();
      setAtiva(true);
      toast.success("Biometria reiniciada neste aparelho");
    } catch {
      toast.error("Não foi possível reiniciar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function desativar() {
    setBusy(true);
    try {
      await disableBiometric();
      setAtiva(false);
      toast.success("Biometria desativada");
    } catch {
      toast.error("Falha ao desativar");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-surface-muted p-2 text-ink-muted"><Fingerprint size={18} /></div>
        <div className="min-w-0">
          <p className="text-body text-ink">Biometria indisponível</p>
          <p className="text-caption text-ink-subtle mt-0.5">Este navegador/aparelho não suporta digital ou reconhecimento facial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-brand/10 p-2 text-brand"><Fingerprint size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-body text-ink">Login com biometria</p>
          <p className="text-caption text-ink-subtle mt-0.5">
            {ativa
              ? "Ativa neste aparelho. Se trocou de celular, reinicie pra cadastrar de novo."
              : "Desbloqueie o app com digital ou Face ID."}
          </p>
        </div>
      </div>

      {ativa ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={reiniciar} loading={busy}>
            Reiniciar
          </Button>
          <Button variant="secondary" onClick={desativar} loading={busy}>
            Desativar
          </Button>
        </div>
      ) : (
        <Button size="lg" className="w-full" onClick={ativar} loading={busy}>
          <Fingerprint size={18} /> Ativar biometria
        </Button>
      )}
    </div>
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
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      setErro("Informe um email válido do parceiro(a)."); return;
    }
    if (user.email && emailNorm === user.email.toLowerCase()) {
      setErro("Use o email do parceiro(a), não o seu."); return;
    }
    setSaving(true); setErro(null);
    try {
      await createFamilyWithInvite(user.id, nome, emailNorm);
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
