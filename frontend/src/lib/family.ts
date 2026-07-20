import { supabase } from "./supabase";

export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string | null;
  status: "ativo" | "pendente";
  invited_email: string | null;
};

export type CoupleAccount = {
  id: string;
  family_id: string;
  valor_atual: number;
};

export type ProfileLite = {
  id: string;
  nome: string;
  avatar_url: string | null;
};

export type FamilyContext = {
  family: { id: string; nome: string; criado_por: string };
  members: FamilyMember[];
  coupleAccount: CoupleAccount;
  profiles: ProfileLite[];  // profiles dos membros ativos (inclui o próprio)
  partner: ProfileLite | null;      // parceiro ativo, se houver
  pendingInvite: FamilyMember | null; // convite pendente que ainda não virou membro
};

/** Retorna o contexto de família do usuário logado, ou null se não estiver em nenhuma. */
export async function getMyFamilyContext(userId: string): Promise<FamilyContext | null> {
  const { data: myMembership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .maybeSingle();
  if (!myMembership) return null;

  const familyId = myMembership.family_id as string;

  const [
    { data: family },
    { data: members },
    { data: coupleAccount },
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase.from("family_members").select("*").eq("family_id", familyId),
    supabase.from("couple_accounts").select("*").eq("family_id", familyId).single(),
  ]);
  if (!family || !coupleAccount) return null;

  const ativos = (members ?? []).filter((m) => m.status === "ativo" && m.user_id);
  const activeIds = ativos.map((m) => m.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles").select("id, nome, avatar_url").in("id", activeIds);

  const partner = (profiles ?? []).find((p) => p.id !== userId) ?? null;
  const pendingInvite = (members ?? []).find((m) => m.status === "pendente") ?? null;

  return {
    family: family as FamilyContext["family"],
    members: (members ?? []) as FamilyMember[],
    coupleAccount: coupleAccount as CoupleAccount,
    profiles: (profiles ?? []) as ProfileLite[],
    partner,
    pendingInvite,
  };
}

/** Cria a família + convite pendente do parceiro numa única RPC transacional
 *  (evita corrida com RLS: a função `create_family_with_invite` faz tudo
 *  como SECURITY DEFINER — família, couple_account, membro criador e convite).
 *  Se o email já pertence a um usuário cadastrado, vincula direto como ativo.
 */
export async function createFamilyWithInvite(_userId: string, nome: string, partnerEmail: string) {
  const email = partnerEmail.trim().toLowerCase();
  const { error } = await supabase.rpc("create_family_with_invite", {
    p_nome: nome.trim() || "Nossa Família",
    p_invited_email: email || null,
  });
  if (error) throw new Error(error.message);
}

/** Convite pendente para o meu email (caso o parceiro me convidou depois do meu cadastro). */
export async function findPendingInviteForEmail(email: string): Promise<FamilyMember | null> {
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .eq("invited_email", email.toLowerCase())
    .eq("status", "pendente")
    .limit(1)
    .maybeSingle();
  return (data as FamilyMember | null) ?? null;
}

export async function acceptInvite(memberId: string, userId: string) {
  const { error } = await supabase
    .from("family_members")
    .update({ user_id: userId, status: "ativo" })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export type CoupleEntry = {
  id: string;
  couple_account_id: string;
  valor_ajuste: number;
  descricao: string | null;
  data: string;
  atualizado_por: string;
  created_at: string;
};

export async function listCoupleEntries(coupleAccountId: string): Promise<CoupleEntry[]> {
  const { data } = await supabase
    .from("couple_account_entries")
    .select("*")
    .eq("couple_account_id", coupleAccountId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as CoupleEntry[];
}

export async function addCoupleEntry(input: {
  couple_account_id: string; user_id: string;
  valor: number; tipo: "deposito" | "retirada"; descricao: string | null; data: string;
}) {
  const valor_ajuste = input.tipo === "deposito" ? Math.abs(input.valor) : -Math.abs(input.valor);
  const { error } = await supabase.from("couple_account_entries").insert({
    couple_account_id: input.couple_account_id,
    valor_ajuste,
    descricao: input.descricao,
    data: input.data,
    atualizado_por: input.user_id,
  });
  if (error) throw new Error(error.message);
}
