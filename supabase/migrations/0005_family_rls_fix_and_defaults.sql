-- Migration 0005 — RLS de família explícita + paleta padrão nas categorias iniciais.

-- ────────────────────────────────────────────────────────────────
-- 1) Policies de família / couple_accounts — reafirmar/expandir.
-- ────────────────────────────────────────────────────────────────

-- families: INSERT permitido a qualquer usuário autenticado desde que ele seja o criador.
drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert
  to authenticated
  with check (criado_por = auth.uid());

-- family_members: INSERT — o próprio user OR o criador da família adicionando convite.
drop policy if exists fm_insert on public.family_members;
create policy fm_insert on public.family_members for insert
  to authenticated
  with check (
    (user_id = auth.uid())
    or exists (
      select 1 from public.families f
       where f.id = family_id and f.criado_por = auth.uid()
    )
  );

-- couple_accounts: INSERT permitido quando a family foi criada pelo user.
--   Mesmo que o trigger seja SECURITY DEFINER, deixamos policy explícita —
--   protege contra ambiente em que definer não bypassa RLS.
drop policy if exists couple_accounts_insert on public.couple_accounts;
create policy couple_accounts_insert on public.couple_accounts for insert
  to authenticated
  with check (
    exists (select 1 from public.families f where f.id = family_id and f.criado_por = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────
-- 2) Cores padrão das categorias iniciais — trigger redefinido.
--    Cada categoria já nasce com uma cor semanticamente distinta (paleta calibrada,
--    não são as brand colors — só ícones/backgrounds semânticos).
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

  insert into public.categories(user_id, nome, icone, cor, ordem) values
    (new.id, 'Mercado',     'shopping-cart',   '#10B981',  1),  -- verde
    (new.id, 'Alimentação', 'utensils',        '#F97316',  2),  -- laranja
    (new.id, 'Transporte',  'car',             '#3B82F6',  3),  -- azul
    (new.id, 'Farmácia',    'pill',            '#EF4444',  4),  -- vermelho
    (new.id, 'Igreja',      'church',          '#8B5CF6',  5),  -- roxo
    (new.id, 'Casa',        'home',            '#EAB308',  6),  -- amarelo
    (new.id, 'Aluguel',     'building',        '#78716C',  7),  -- pedra
    (new.id, 'Faculdade',   'graduation-cap',  '#0EA5E9',  8),  -- ciano
    (new.id, 'Lazer',       'gamepad-2',       '#EC4899',  9),  -- pink
    (new.id, 'Streaming',   'tv',              '#A855F7', 10),  -- púrpura
    (new.id, 'Saúde',       'heart-pulse',     '#F43F5E', 11),  -- rosa forte
    (new.id, 'Academia',    'dumbbell',        '#14B8A6', 12),  -- teal
    (new.id, 'Presentes',   'gift',            '#F59E0B', 13),  -- âmbar
    (new.id, 'Pets',        'cat',             '#D97706', 14),  -- caramelo
    (new.id, 'Outros',      'more-horizontal', '#6B7280', 15);  -- cinza

  -- Aceita convites pendentes com meu email
  update public.family_members
     set user_id = new.id, status = 'ativo'
   where invited_email = new.email
     and status = 'pendente';

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3) Backfill: categorias existentes sem cor recebem paleta por nome.
-- ────────────────────────────────────────────────────────────────
update public.categories set cor = case nome
  when 'Mercado'     then '#10B981'
  when 'Alimentação' then '#F97316'
  when 'Transporte'  then '#3B82F6'
  when 'Farmácia'    then '#EF4444'
  when 'Igreja'      then '#8B5CF6'
  when 'Casa'        then '#EAB308'
  when 'Aluguel'     then '#78716C'
  when 'Faculdade'   then '#0EA5E9'
  when 'Lazer'       then '#EC4899'
  when 'Streaming'   then '#A855F7'
  when 'Saúde'       then '#F43F5E'
  when 'Academia'    then '#14B8A6'
  when 'Presentes'   then '#F59E0B'
  when 'Pets'        then '#D97706'
  when 'Outros'      then '#6B7280'
  else '#4C5FA8'
end
where cor is null;

-- ────────────────────────────────────────────────────────────────
-- 4) WebAuthn credentials — para biometria.
-- ────────────────────────────────────────────────────────────────
create table if not exists public.webauthn_credentials (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  credential_id  text not null unique,        -- base64url
  public_key     text not null,               -- base64 SPKI ou COSE-encoded
  counter        bigint not null default 0,
  transports     text,                        -- CSV
  created_at     timestamptz not null default now()
);

alter table public.webauthn_credentials enable row level security;
drop policy if exists wa_all on public.webauthn_credentials;
create policy wa_all on public.webauthn_credentials for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
