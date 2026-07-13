-- Migration 0004 — limite mensal por categoria + cache de resumos mensais de IA.

-- ────────────────────────────────────────────────────────────────
-- 1) categories.limite_mensal (nullable = sem limite)
-- ────────────────────────────────────────────────────────────────
alter table public.categories
  add column if not exists limite_mensal numeric(12,2) check (limite_mensal is null or limite_mensal > 0);

-- ────────────────────────────────────────────────────────────────
-- 2) monthly_summaries — cache do resumo narrativo gerado por IA.
--    Uma linha por (user_id, year_month). O trigger de novo user
--    não precisa mexer nisso; a tabela é populada sob demanda.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.monthly_summaries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  year_month   text not null,           -- 'YYYY-MM'
  texto        text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, year_month)
);

alter table public.monthly_summaries enable row level security;
drop policy if exists monthly_summaries_all on public.monthly_summaries;
create policy monthly_summaries_all on public.monthly_summaries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
