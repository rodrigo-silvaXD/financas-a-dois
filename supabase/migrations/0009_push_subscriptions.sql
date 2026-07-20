-- Migration 0009 — infraestrutura de Web Push notifications.
--
-- Guarda subscription do navegador (endpoint + keys) por user/device.
-- Um user pode ter várias (celular + desktop). Endpoint é único.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_sub_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_sub_own on public.push_subscriptions;
create policy push_sub_own on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
