"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Heart, Mail } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/Toast";
import { Badge, BottomSheet, Button, Card, CurrencyInput, EmptyState, Input, TopBar } from "@/components/ui";
import { AnimatedBRL } from "@/components/AnimatedNumber";
import { SkeletonCard, SkeletonRow, useMinLoading } from "@/components/Skeleton";
import { staggerContainerFast, fadeUpItem } from "@/lib/motion";
import { formatBRL, formatDateFull, todayISO } from "@/lib/format";
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
  const showSkeleton = useMinLoading(loading);

  const load = useCallback(async () => {
    if (!user) return;
    const ctx = await getMyFamilyContext(user.id);
    setFam(ctx);
    if (ctx) setEntries(await listCoupleEntries(ctx.coupleAccount.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (showSkeleton) {
    return (
      <main>
        <TopBar title="Conta do casal" />
        <section className="mx-auto max-w-md px-5 pt-4 space-y-6">
          <SkeletonCard />
          <SkeletonRow />
          <SkeletonRow />
        </section>
      </main>
    );
  }

  if (!fam) {
    return (
      <main>
        <TopBar title="Conta do casal" />
        <section className="mx-auto max-w-md px-5 pt-4">
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

  const nomes = new Map(fam.profiles.map((p) => [p.id, p.nome]));

  return (
    <main>
      <TopBar title="Conta do casal" />
      <section className="mx-auto max-w-md px-5 pt-4 space-y-8">
        <Card className="p-6">
          <span className="text-caption text-ink-subtle uppercase tracking-wide font-medium">Saldo compartilhado</span>
          <div className="mt-2">
            <AnimatedBRL value={Number(fam.coupleAccount.valor_atual)}
              className={cn("block text-display",
                fam.coupleAccount.valor_atual < 0 ? "text-danger" : "text-ink")} />
          </div>
          <div className="mt-4">
            <Badge tone="brand">A dois</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => setSheet("deposito")}>
            <ArrowUpRight size={18} /> Adicionar
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("retirada")}>
            <ArrowDownRight size={18} /> Retirar
          </Button>
        </div>

        {!fam.partner && fam.pendingInvite && (
          <Card className="flex items-start gap-3 p-5 border-warning/40">
            <Mail size={18} className="mt-0.5 text-warning shrink-0" />
            <div>
              <p className="text-body text-ink font-medium">Aguardando parceiro(a)</p>
              <p className="text-bodysm text-ink-muted mt-1 leading-relaxed">
                Convite pendente para <span className="text-ink">{fam.pendingInvite.invited_email}</span>. Depois do cadastro dele(a), tudo aqui aparece pra vocês dois.
              </p>
            </div>
          </Card>
        )}

        <div>
          <h2 className="mb-4 text-heading text-ink-muted font-semibold">Histórico</h2>
          {entries.length === 0 ? (
            <EmptyState title="Nenhum movimento ainda" description="Registre o primeiro depósito ou retirada." />
          ) : (
            <motion.ul className="space-y-3"
              variants={staggerContainerFast} initial="initial" animate="animate">
              {entries.map((e) => {
                const positivo = Number(e.valor_ajuste) >= 0;
                const autor = nomes.get(e.atualizado_por) ?? "…";
                return (
                  <motion.li key={e.id} variants={fadeUpItem}>
                    <Card className="flex items-center gap-3 p-4">
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg shrink-0",
                        positivo ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                      )}>
                        {positivo ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body text-ink font-medium">
                          {e.descricao || (positivo ? "Depósito" : "Retirada")}
                        </p>
                        <p className="text-caption text-ink-subtle mt-0.5">
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
            </motion.ul>
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
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (valor <= 0) { setErro("Valor inválido."); return; }
    setSaving(true); setErro(null);
    try {
      await addCoupleEntry({
        couple_account_id: coupleAccountId, user_id: userId,
        valor, tipo, descricao: descricao.trim() || null, data,
      });
      await new Promise((r) => setTimeout(r, 100));  // pequeno delay pra ver o feedback
      await onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={salvar} className="space-y-5">
      <CurrencyInput label="Valor" value={valor} onChange={setValor} large />
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
