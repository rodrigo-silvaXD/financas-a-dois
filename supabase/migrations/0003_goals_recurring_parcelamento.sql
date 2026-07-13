-- Migration 0003 — objetivos com histórico, vínculo de recorrentes e parcelamento.

-- ────────────────────────────────────────────────────────────────
-- 1) transactions: colunas de vínculo (parcelamento_id e recorrente_id).
--    Nullable — só preenchidas quando a transação vem de um parcelamento
--    ou de uma recorrente. Permite agrupar sem chave composta.
-- ────────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists parcelamento_id uuid,
  add column if not exists recorrente_id   uuid references public.recurring_expenses(id) on delete set null;

create index if not exists tx_parcelamento_idx on public.transactions (user_id, parcelamento_id) where parcelamento_id is not null;
create index if not exists tx_recorrente_idx   on public.transactions (user_id, recorrente_id)   where recorrente_id   is not null;

-- Aceitar 'recorrente' na CHECK de origem.
alter table public.transactions drop constraint if exists transactions_origem_check;
alter table public.transactions add constraint transactions_origem_check
  check (origem in ('manual', 'importado', 'ia_texto', 'ia_foto', 'recorrente'));

-- ────────────────────────────────────────────────────────────────
-- 2) goal_entries — histórico de aportes num objetivo. Sync trigger
--    reidrata goals.valor_atual (mesmo padrão de couple_account_entries).
-- ────────────────────────────────────────────────────────────────
create table if not exists public.goal_entries (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  valor       numeric(12,2) not null,      -- + aporta, − retira
  descricao   text,
  data        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists goal_entries_goal_idx on public.goal_entries (goal_id, data desc);

alter table public.goal_entries enable row level security;
drop policy if exists goal_entries_all on public.goal_entries;
create policy goal_entries_all on public.goal_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recompute goals.valor_atual a partir de goal_entries.
create or replace function public.recompute_goal(p_goal_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.goals g
     set valor_atual = coalesce((
       select sum(valor) from public.goal_entries where goal_id = p_goal_id
     ), 0)
   where g.id = p_goal_id;
$$;

create or replace function public.tg_sync_goal()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_goal(old.goal_id);
    return old;
  else
    perform public.recompute_goal(new.goal_id);
    if tg_op = 'UPDATE' and old.goal_id <> new.goal_id then
      perform public.recompute_goal(old.goal_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists sync_goal on public.goal_entries;
create trigger sync_goal
  after insert or update or delete on public.goal_entries
  for each row execute function public.tg_sync_goal();
