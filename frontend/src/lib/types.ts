// Espelha o schema public do Supabase — só o que o frontend usa.

export type Profile = {
  id: string;
  nome: string;
  avatar_url: string | null;
};

export type Category = {
  id: string;
  user_id: string;
  nome: string;
  icone: string;
  cor: string | null;
  ordem: number;
  ativa: boolean;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  tipo: "gasto" | "entrada";
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  data: string;                    // YYYY-MM-DD
  origem: "manual" | "importado" | "ia_texto" | "ia_foto";
  recorrente: boolean;
  parcela_atual: number | null;
  parcela_total: number | null;
  created_at: string;
};
