-- Migration 0002 — família:
--   1. handle_new_user passa a aceitar convites pendentes com o mesmo email.
--   2. Limite de 2 membros por família (trigger BEFORE INSERT).

-- ────────────────────────────────────────────────────────────────
-- 1) handle_new_user — redefine para também aceitar convites.
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

  -- Aceita convites pendentes emitidos para este email.
  update public.family_members
     set user_id = new.id, status = 'ativo'
   where invited_email = new.email
     and status = 'pendente';

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 2) Limite de 2 membros por família.
-- ────────────────────────────────────────────────────────────────
create or replace function public.tg_limit_family()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.family_members where family_id = new.family_id) >= 2 then
    raise exception 'Família já atingiu o limite de 2 membros'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_family on public.family_members;
create trigger limit_family
  before insert on public.family_members
  for each row execute function public.tg_limit_family();
