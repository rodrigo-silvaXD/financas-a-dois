-- Migration 0008 — gerenciar família: renomear, sair, dissolver.
--
-- Continuação do padrão de RPCs SECURITY DEFINER pra família (0006/0007).
-- Motivação: se você cadastrou o email errado, o parceiro aceitou o convite
-- na conta errada, ou vocês precisam separar as contas, não havia jeito de
-- desfazer o vínculo pelo app.
--
-- • rename_my_family(nome)        — só o criador pode
-- • leave_my_family()             — qualquer membro sai; se ficar vazia, apaga
-- • dissolve_my_family()          — só o criador; remove tudo (couple_account
--                                   é cascade, entries idem).

-- ────────────────────────────────────────────────────────────────
-- rename_my_family
-- ────────────────────────────────────────────────────────────────
create or replace function public.rename_my_family(p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_fam  uuid;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.' using errcode = '28000';
  end if;
  if v_nome is null then
    raise exception 'Nome não pode ser vazio.' using errcode = '22023';
  end if;

  select id into v_fam from public.families where criado_por = v_uid limit 1;
  if v_fam is null then
    raise exception 'Você não é criador de nenhuma família.' using errcode = 'P0002';
  end if;

  update public.families set nome = v_nome where id = v_fam;
end;
$$;

grant execute on function public.rename_my_family(text) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- leave_my_family — qualquer membro pode sair.
-- Se sobrar apenas o convite pendente (ou 0 membros ativos), a família
-- inteira é apagada (couple_account e entries caem em cascata).
-- ────────────────────────────────────────────────────────────────
create or replace function public.leave_my_family()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_fam       uuid;
  v_restantes int;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.' using errcode = '28000';
  end if;

  select family_id into v_fam
    from public.family_members
   where user_id = v_uid and status = 'ativo'
   limit 1;
  if v_fam is null then return; end if;

  delete from public.family_members
   where family_id = v_fam and user_id = v_uid;

  -- Se não sobrou nenhum membro ativo, a família fica órfã — apaga tudo.
  select count(*) into v_restantes
    from public.family_members
   where family_id = v_fam and status = 'ativo';
  if v_restantes = 0 then
    delete from public.families where id = v_fam;
  end if;
end;
$$;

grant execute on function public.leave_my_family() to authenticated;

-- ────────────────────────────────────────────────────────────────
-- dissolve_my_family — só o criador. Apaga tudo.
-- ────────────────────────────────────────────────────────────────
create or replace function public.dissolve_my_family()
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
  if v_fam is null then
    raise exception 'Você não é criador de nenhuma família.' using errcode = 'P0002';
  end if;

  -- Cascade: family_members, couple_accounts, couple_account_entries — todos caem.
  delete from public.families where id = v_fam;
end;
$$;

grant execute on function public.dissolve_my_family() to authenticated;
