-- Migration 0006 — RPC atômica de criação de família + hardening de RLS/triggers.
--
-- Motivação: alguns ambientes disparavam "new row violates row level security"
-- durante createFamilyWithInvite, porque a inserção do convite pendente
-- (user_id = null) atravessava a policy fm_insert com timing dependente do
-- trigger on_family_created. Centralizar tudo numa RPC SECURITY DEFINER remove
-- a corrida — a família, a couple_account, o vínculo do criador e o convite
-- pendente são criados numa única transação, sem depender de RLS no meio.

-- ────────────────────────────────────────────────────────────────
-- 1) RPC pública: create_family_with_invite
--    Chamada pelo frontend via supabase.rpc().
--    Retorna o family_id criado (ou o já existente, se o user já tem família).
-- ────────────────────────────────────────────────────────────────
create or replace function public.create_family_with_invite(
  p_nome text,
  p_invited_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_invited_email, '')));
  v_nome  text := coalesce(nullif(trim(p_nome), ''), 'Nossa Família');
  v_fam   uuid;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.' using errcode = '28000';
  end if;

  -- Se o usuário já pertence a uma família ativa, devolve ela — evita duplicar.
  select fm.family_id into v_fam
    from public.family_members fm
   where fm.user_id = v_uid and fm.status = 'ativo'
   limit 1;
  if v_fam is not null then
    return v_fam;
  end if;

  -- Garante que existe profile — evita FK error se o trigger de novo user
  -- ainda não rodou por algum motivo (raro, mas defensivo).
  insert into public.profiles(id, nome)
    values (v_uid, coalesce(
      (select raw_user_meta_data->>'nome' from auth.users where id = v_uid),
      (select split_part(email, '@', 1) from auth.users where id = v_uid),
      'Usuário'
    ))
    on conflict (id) do nothing;

  -- Cria a família (trigger on_family_created popula couple_account + membro criador).
  insert into public.families(nome, criado_por) values (v_nome, v_uid)
    returning id into v_fam;

  -- Convite pendente (opcional — só se email válido informado).
  if v_email <> '' and v_email like '%@%' then
    -- Se o parceiro já tem conta com esse email, vincula direto como ativo.
    declare
      v_partner uuid;
    begin
      select id into v_partner from auth.users where lower(email) = v_email limit 1;
      if v_partner is not null and v_partner <> v_uid then
        insert into public.family_members(family_id, user_id, status)
          values (v_fam, v_partner, 'ativo')
          on conflict (family_id, user_id) do nothing;
      else
        insert into public.family_members(family_id, invited_email, status)
          values (v_fam, v_email, 'pendente');
      end if;
    end;
  end if;

  return v_fam;
end;
$$;

grant execute on function public.create_family_with_invite(text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- 2) Hardening do trigger on_family_created:
--    idempotente (ON CONFLICT), tolerante a re-execução manual.
-- ────────────────────────────────────────────────────────────────
create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.couple_accounts(family_id)
    values (new.id)
    on conflict (family_id) do nothing;

  insert into public.family_members(family_id, user_id, status)
    values (new.id, new.criado_por, 'ativo')
    on conflict (family_id, user_id) do nothing;

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3) tg_limit_family agora só conta membros DIFERENTES do novo
--    (senão o próprio insert do trigger de família dá "limite atingido"
--    em ambientes onde o BEFORE INSERT vê o total já com o criador).
-- ────────────────────────────────────────────────────────────────
create or replace function public.tg_limit_family()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from public.family_members
   where family_id = new.family_id
     and (new.user_id is null or user_id is distinct from new.user_id);
  if v_count >= 2 then
    raise exception 'Família já atingiu o limite de 2 membros'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 4) Reafirma policies com "to authenticated" — evita ambiguidade com anon.
-- ────────────────────────────────────────────────────────────────
drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert
  to authenticated
  with check (criado_por = auth.uid());

drop policy if exists fm_insert on public.family_members;
create policy fm_insert on public.family_members for insert
  to authenticated
  with check (
    -- (a) próprio user se auto-adicionando (aceite direto pela RPC de convite futuro)
    (user_id is not null and user_id = auth.uid())
    -- (b) criador da família cadastrando o convite pendente (user_id null OK)
    or exists (
      select 1 from public.families f
       where f.id = family_id and f.criado_por = auth.uid()
    )
  );

drop policy if exists couple_accounts_insert on public.couple_accounts;
create policy couple_accounts_insert on public.couple_accounts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.families f
       where f.id = family_id and f.criado_por = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 5) UPDATE do family_members: reafirma para permitir aceite via UPDATE.
--    Antes: WITH CHECK (user_id = auth.uid()). OK, mas garantimos.
-- ────────────────────────────────────────────────────────────────
drop policy if exists fm_update_accept on public.family_members;
create policy fm_update_accept on public.family_members for update
  to authenticated
  using (user_id = auth.uid() or invited_email = auth.email())
  with check (user_id = auth.uid());
