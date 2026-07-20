-- Migration 0007 — gerenciar convite pendente da família.
--
-- Permite ao criador da família:
--   • trocar o email do convite pendente (RPC update_pending_invite)
--   • cancelar o convite pendente (RPC cancel_pending_invite)
--
-- Não muda RLS diretamente — usa RPCs SECURITY DEFINER pra ficar consistente
-- com create_family_with_invite (0006) e evitar reabrir o UPDATE/DELETE
-- direto na tabela family_members.

-- ────────────────────────────────────────────────────────────────
-- Update do email do convite pendente.
-- ────────────────────────────────────────────────────────────────
create or replace function public.update_pending_invite(p_new_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_new_email, '')));
  v_fam   uuid;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.' using errcode = '28000';
  end if;
  if v_email = '' or v_email not like '%@%' then
    raise exception 'Email inválido.' using errcode = '22023';
  end if;

  -- Família criada por mim (só o criador pode gerenciar o convite).
  select id into v_fam from public.families where criado_por = v_uid limit 1;
  if v_fam is null then
    raise exception 'Você não é criador de nenhuma família.' using errcode = 'P0002';
  end if;

  -- Não pode convidar o próprio email.
  if exists (select 1 from auth.users where id = v_uid and lower(email) = v_email) then
    raise exception 'Use o email do parceiro, não o seu.' using errcode = '22023';
  end if;

  -- Se o novo email já pertence a um usuário cadastrado, vincula direto.
  declare v_partner uuid;
  begin
    select id into v_partner from auth.users where lower(email) = v_email limit 1;
    if v_partner is not null then
      delete from public.family_members
       where family_id = v_fam and status = 'pendente';
      insert into public.family_members(family_id, user_id, status)
        values (v_fam, v_partner, 'ativo')
        on conflict (family_id, user_id) do nothing;
      return;
    end if;
  end;

  -- Caso contrário, atualiza o convite pendente (ou cria se não existir).
  update public.family_members
     set invited_email = v_email
   where family_id = v_fam and status = 'pendente';
  if not found then
    insert into public.family_members(family_id, invited_email, status)
      values (v_fam, v_email, 'pendente');
  end if;
end;
$$;

grant execute on function public.update_pending_invite(text) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- Cancelar convite pendente.
-- ────────────────────────────────────────────────────────────────
create or replace function public.cancel_pending_invite()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fam uuid;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.' using errcode = '28000';
  end if;

  select id into v_fam from public.families where criado_por = v_uid limit 1;
  if v_fam is null then return; end if;

  delete from public.family_members
   where family_id = v_fam and status = 'pendente';
end;
$$;

grant execute on function public.cancel_pending_invite() to authenticated;
