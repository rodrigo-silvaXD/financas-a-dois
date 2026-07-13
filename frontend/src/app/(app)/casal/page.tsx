"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Heart, Mail } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Badge, BottomSheet, Button, Card, EmptyState, Input, TopBar } from "@/components/ui";
import { formatBRL, formatDateFull, parseBRL, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  addCoupleEntry, getMyFamilyContext, listCoupleEntries,
  type CoupleEntry, type FamilyContext,
} from "@/lib/family";

export default function CasalPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [fam, setFam] = useState<FamilyContext | null>(null);
  const [entries, setEntries] = useState<CoupleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<"deposito" | "retirada" | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const ctx = await getMyFamilyContext(user.id);
    setFam(ctx);
    if (ctx) setEntries(await listCoupleEntries(ctx.coupleAccount.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <main><TopBar title="Conta do casal" /><section className="mx-auto max-w-md px-4 pt-4"><Card className="text-center text-ink-subtle">Carregando…</Card></section></main>;
  }

  if (!fam) {
    return (
      <main>
        <TopBar title="Conta do casal" />
        <section className="mx-auto max-w-md px-4 pt-4">
          <EmptyState
            icon={Heart}
            title="Sem conta do casal ainda"
            description="Crie sua família no perfil pra abrir a conta compartilhada."
            action={<Link href="/perfil"><Button>Criar família</Button></Link>}
          />
        </section>
      </main>
    );
  }

  // Mapa userId → nome pra exibir no histórico.
  const nomes = new Map(fam.profiles.map((p) => [p.id, p.nome]));

  return (
    <main>
      <TopBar title="Conta do casal" />
      <section className="mx-auto max-w-md px-4 pt-4 space-y-4">
        <Card className="p-6">
          <span className="text-caption text-ink-subtle uppercase tracking-wide">Saldo compartilhado</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn("text-display", fam.coupleAccount.valor_atual < 0 ? "text-danger" : "text-ink")}>
              {formatBRL(Number(fam.coupleAccount.valor_atual))}
            </span>
          </div>
          <div className="mt-3">
            <Badge tone="brand">A dois</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" onClick={() => setSheet("deposito")}>
            <ArrowUpRight size={18} /> Adicionar
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("retirada")}>
            <ArrowDownRight size={18} /> Retirar
          </Button>
        </div>

        {!fam.partner && fam.pendingInvite && (
          <Card className="flex items-start gap-3 p-4 border-warning/40">
            <Mail size={18} className="mt-0.5 text-warning" />
            <div>
              <p className="text-body text-ink">Aguardando parceiro(a)</p>
              <p className="text-bodysm text-ink-muted">
                Convite pendente para <span className="text-ink">{fam.pendingInvite.invited_email}</span>. Depois do cadastro dele(a), tudo aqui aparece pra vocês dois.
              </p>
            </div>
          </Card>
        )}

        <div>
          <h2 className="mb-2 text-heading text-ink">Histórico</h2>
          {entries.length === 0 ? (
            <EmptyState title="Nenhum movimento ainda" description="Registre o primeiro depósito ou retirada." />
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => {
                const positivo = Number(e.valor_ajuste) >= 0;
                const autor = nomes.get(e.atualizado_por) ?? "…";
                return (
                  <motion.li key={e.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Card className="flex items-center gap-3 p-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md",
                        positivo ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                      )}>
                        {positivo ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body text-ink">
                          {e.descricao || (positivo ? "Depósito" : "Retirada")}
                        </p>
                        <p className="text-caption text-ink-subtle">
                          {autor} · {formatDateFull(e.data)}
                        </p>
                      </div>
                      <span className={cn("text-body font-semibold",
                        positivo ? "text-success" : "text-danger")}>
                        {positivo ? "+" : "−"} {formatBRL(Math.abs(Number(e.valor_ajuste)))}
                      </span>
                    </Card>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "deposito" ? "Adicionar à conta" : "Retirar da conta"}
      >
        {sheet && (
          <EntryForm
            tipo={sheet}
            coupleAccountId={fam.coupleAccount.id}
            userId={user!.id}
            onDone={async () => {
              setSheet(null);
              await load();
              toast.success(sheet === "deposito" ? "Depósito registrado" : "Retirada registrada");
            }}
          />
        )}
      </BottomSheet>
    </main>
  );
}

function EntryForm({ tipo, coupleAccountId, userId, onDone }: {
  tipo: "deposito" | "retirada"; coupleAccountId: string; userId: string;
  onDone: () => void | Promise<void>;
}) {
  const [valorStr, setValorStr] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const valor = parseBRL(valorStr);
    if (valor <= 0) { setErro("Valor inválido."); return; }
    setSaving(true); setErro(null);
    try {
      await addCoupleEntry({
        couple_account_id: coupleAccountId,
        user_id: userId,
        valor, tipo,
        descricao: descricao.trim() || null,
        data,
      });
      await onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <label className="block">
        <span className="text-bodysm text-ink-muted font-medium">Valor (R$)</span>
        <input
          inputMode="decimal"
          value={valorStr}
          onChange={(e) => setValorStr(e.target.value)}
          placeholder="0,00"
          className="mt-1.5 h-14 w-full rounded-md bg-surface-muted px-4 text-display text-ink text-right outline-none border border-transparent focus:border-brand focus:bg-surface transition-colors duration-base ease-apple"
        />
      </label>
      <Input name="descricao" label="Descrição (opcional)" placeholder="Ex.: mesada do mês"
        value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <Input name="data" label="Data" type="date"
        value={data} onChange={(e) => setData(e.target.value)} />
      {erro && <p className="text-caption text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>
        {tipo === "deposito" ? "Confirmar depósito" : "Confirmar retirada"}
      </Button>
    </form>
  );
}
