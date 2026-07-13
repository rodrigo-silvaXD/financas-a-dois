-- Finanças a Dois — schema inicial + RLS + triggers + seed.
-- Regra de ouro: nenhum usuário vê dados privados do parceiro. Só couple_account é compartilhada.

-- ────────────────────────────────────────────────────────────────
-- Extensões
-- ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid

-- ────────────────────────────────────────────────────────────────
-- Tabelas
-- ────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null default 'Nossa Família',
  criado_por  uuid not null references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.family_members (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete cascade,
  status         text not null default 'pendente' check (status in ('ativo', 'pendente')),
  invited_email  text,
  created_at     timestamptz not null default now(),
  unique (family_id, user_id)
);
create index on public.family_members (user_id);
create index on public.family_members (family_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  nome        text not null,
  icone       text not null,
  cor         text,
  ordem       integer not null default 0,
  ativa       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.categories (user_id);

create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  tipo           text not null check (tipo in ('gasto', 'entrada')),
  valor          numeric(12,2) not null check (valor >= 0),
  categoria_id   uuid references public.categories(id) on delete set null,
  descricao      text,
  data           date not null default current_date,
  origem         text not null default 'manual' check (origem in ('manual', 'importado', 'ia_texto', 'ia_foto')),
  id_externo     text,
  recorrente     boolean not null default false,
  parcela_atual  integer,
  parcela_total  integer,
  created_at     timestamptz not null default now(),
  check (
    (parcela_atual is null and parcela_total is null)
    or (parcela_atual between 1 and parcela_total)
  )
);
create index on public.transactions (user_id, data desc);
create index on public.transactions (user_id, categoria_id);
-- dedup opcional na importação
create unique index on public.transactions (user_id, id_externo) where id_externo is not null;

create table public.category_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  pattern       text not null,
  category_id   uuid not null references public.categories(id) on delete cascade,
  vezes_usado   integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, pattern)
);

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  nome         text not null,
  valor_atual  numeric(12,2) not null default 0,
  valor_meta   numeric(12,2) not null check (valor_meta > 0),
  icone        text,
  cor          text,
  created_at   timestamptz not null default now()
);
create index on public.goals (user_id);

create table public.recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  nome          text not null,
  valor         numeric(12,2) not null check (valor >= 0),
  categoria_id  uuid references public.categories(id) on delete set null,
  dia_do_mes    integer not null check (dia_do_mes between 1 and 31),
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on public.recurring_expenses (user_id);

create table public.couple_accounts (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null unique references public.families(id) on delete cascade,
  valor_atual  numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

create table public.couple_account_entries (
  id                  uuid primary key default gen_random_uuid(),
  couple_account_id   uuid not null references public.couple_accounts(id) on delete cascade,
  valor_ajuste        numeric(12,2) not null,
  descricao           text,
  data                date not null default current_date,
  atualizado_por      uuid not null references public.profiles(id) on delete restrict,
  created_at          timestamptz not null default now()
);
create index on public.couple_account_entries (couple_account_id, data desc);

-- ────────────────────────────────────────────────────────────────
-- Helpers (SECURITY DEFINER pra evitar recursão de RLS)
-- ────────────────────────────────────────────────────────────────

-- IDs das famílias em que o usuário atual está ativo.
create or replace function public.my_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
    from public.family_members
   where user_id = auth.uid()
     and status = 'ativo';
$$;

-- Verifica se `target_user` está na MESMA família ativa do usuário atual.
create or replace function public.same_family(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.family_members me
      join public.family_members other on me.family_id = other.family_id
     where me.user_id    = auth.uid()  and me.status    = 'ativo'
       and other.user_id = target_user and other.status = 'ativo'
  );
$$;

grant execute on function public.my_family_ids() to authenticated;
grant execute on function public.same_family(uuid) to authenticated;

-- Manter updated_at
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles_updated
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

create trigger touch_category_rules_updated
  before update on public.category_rules
  for each row execute function public.tg_touch_updated_at();

-- ────────────────────────────────────────────────────────────────
-- Trigger: novo usuário → profile + 15 categorias padrão
-- ────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nome_novo text;
begin
  nome_novo := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));

  insert into public.profiles(id, nome) values (new.id, nome_novo);

  insert into public.categories(user_id, nome, icone, ordem) values
    (new.id, 'Mercado',     'shopping-cart',    1),
    (new.id, 'Alimentação', 'utensils',         2),
    (new.id, 'Transporte',  'car',              3),
    (new.id, 'Farmácia',    'pill',             4),
    (new.id, 'Igreja',      'church',           5),
    (new.id, 'Casa',        'home',             6),
    (new.id, 'Aluguel',     'building',         7),
    (new.id, 'Faculdade',   'graduation-cap',   8),
    (new.id, 'Lazer',       'gamepad-2',        9),
    (new.id, 'Streaming',   'tv',              10),
    (new.id, 'Saúde',       'heart-pulse',     11),
    (new.id, 'Academia',    'dumbbell',        12),
    (new.id, 'Presentes',   'gift',            13),
    (new.id, 'Pets',        'cat',             14),
    (new.id, 'Outros',      'more-horizontal', 15);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- Trigger: nova família → cria couple_account automaticamente
-- (dispensa policy de INSERT em couple_accounts)
-- ────────────────────────────────────────────────────────────────
create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.couple_accounts(family_id) values (new.id);
  insert into public.family_members(family_id, user_id, status)
    values (new.id, new.criado_por, 'ativo');
  return new;
end;
$$;

create trigger on_family_created
  after insert on public.families
  for each row execute function public.handle_new_family();

-- ────────────────────────────────────────────────────────────────
-- Trigger: manter couple_accounts.valor_atual em sincronia
-- ────────────────────────────────────────────────────────────────
create or replace function public.recompute_couple_account(p_couple_account_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.couple_accounts ca
     set valor_atual = coalesce((
       select sum(valor_ajuste)
         from public.couple_account_entries
        where couple_account_id = p_couple_account_id
     ), 0)
   where ca.id = p_couple_account_id;
$$;

create or replace function public.tg_sync_couple_account()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_couple_account(old.couple_account_id);
    return old;
  else
    perform public.recompute_couple_account(new.couple_account_id);
    if tg_op = 'UPDATE' and old.couple_account_id <> new.couple_account_id then
      perform public.recompute_couple_account(old.couple_account_id);
    end if;
    return new;
  end if;
end;
$$;

create trigger sync_couple_account
  after insert or update or delete on public.couple_account_entries
  for each row execute function public.tg_sync_couple_account();

-- ────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────

alter table public.profiles              enable row level security;
alter table public.families              enable row level security;
alter table public.family_members        enable row level security;
alter table public.categories            enable row level security;
alter table public.transactions          enable row level security;
alter table public.category_rules        enable row level security;
alter table public.goals                 enable row level security;
alter table public.recurring_expenses    enable row level security;
alter table public.couple_accounts       enable row level security;
alter table public.couple_account_entries enable row level security;

-- profiles: próprio + membros da mesma família ativa. UPDATE só do próprio.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.same_family(id));

create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- families: SELECT/UPDATE só membros ativos. INSERT: qualquer usuário autenticado (vira criador via trigger).
create policy families_select on public.families for select
  using (id in (select public.my_family_ids()));

create policy families_insert on public.families for insert
  with check (criado_por = auth.uid());

create policy families_update on public.families for update
  using (id in (select public.my_family_ids()))
  with check (id in (select public.my_family_ids()));

-- family_members: SELECT da própria família. INSERT só o criador convida.
create policy fm_select on public.family_members for select
  using (family_id in (select public.my_family_ids()));

create policy fm_insert on public.family_members for insert
  with check (
    exists (
      select 1 from public.families f
       where f.id = family_id and f.criado_por = auth.uid()
    )
  );

-- Aceitar convite: membro pendente vinculado ao meu email pode virar ativo.
create policy fm_update_accept on public.family_members for update
  using (user_id = auth.uid() or invited_email = auth.email())
  with check (user_id = auth.uid());

-- categories: dono only.
create policy categories_all on public.categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transactions: dono only. Privacidade máxima.
create policy transactions_all on public.transactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- category_rules: dono only.
create policy category_rules_all on public.category_rules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- goals: dono only.
create policy goals_all on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- recurring_expenses: dono only.
create policy recurring_all on public.recurring_expenses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- couple_accounts: SELECT/UPDATE só membros. (INSERT vem via trigger de families.)
create policy couple_accounts_select on public.couple_accounts for select
  using (family_id in (select public.my_family_ids()));

create policy couple_accounts_update on public.couple_accounts for update
  using (family_id in (select public.my_family_ids()))
  with check (family_id in (select public.my_family_ids()));

-- couple_account_entries: SELECT/INSERT membros; UPDATE/DELETE só autor.
create policy cae_select on public.couple_account_entries for select
  using (
    couple_account_id in (
      select id from public.couple_accounts
       where family_id in (select public.my_family_ids())
    )
  );

create policy cae_insert on public.couple_account_entries for insert
  with check (
    atualizado_por = auth.uid()
    and couple_account_id in (
      select id from public.couple_accounts
       where family_id in (select public.my_family_ids())
    )
  );

create policy cae_update on public.couple_account_entries for update
  using (atualizado_por = auth.uid())
  with check (atualizado_por = auth.uid());

create policy cae_delete on public.couple_account_entries for delete
  using (atualizado_por = auth.uid());
