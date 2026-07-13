import { supabase } from "./supabase";

export type Goal = {
  id: string;
  user_id: string;
  nome: string;
  valor_atual: number;
  valor_meta: number;
  icone: string | null;
  cor: string | null;
  created_at: string;
};

export type GoalEntry = {
  id: string;
  goal_id: string;
  user_id: string;
  valor: number;
  descricao: string | null;
  data: string;
  created_at: string;
};

export async function listGoals(userId: string): Promise<Goal[]> {
  const { data } = await supabase.from("goals").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Goal[];
}

export async function createGoal(userId: string, g: {
  nome: string; valor_meta: number; icone?: string | null; cor?: string | null;
}) {
  const { error } = await supabase.from("goals").insert({
    user_id: userId, nome: g.nome, valor_meta: g.valor_meta,
    icone: g.icone ?? null, cor: g.cor ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addGoalEntry(goalId: string, userId: string, valor: number, descricao: string | null) {
  const { error } = await supabase.from("goal_entries").insert({
    goal_id: goalId, user_id: userId, valor, descricao,
  });
  if (error) throw new Error(error.message);
}

export async function listGoalEntries(goalId: string): Promise<GoalEntry[]> {
  const { data } = await supabase.from("goal_entries").select("*")
    .eq("goal_id", goalId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as GoalEntry[];
}
