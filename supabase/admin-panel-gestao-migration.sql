-- ==========================================================================
-- RUNElog: painel de gestão exclusivo do Admin (separado da Logística).
--
-- Adiciona:
--   1) "active" em drivers/representatives/logistics_users — Admin pode
--      ativar/inativar o acesso de um usuário sem excluir o cadastro.
--   2) "permissions" em logistics_users — Admin controla quais módulos
--      (Importador/Rotas/Fretes/Frota/Rotas & Produtos) cada pessoa da
--      Logística pode ver, individualmente.
--   3) current_profile() passa a exigir active = true pra driver/
--      representative/logistics — um usuário inativado perde acesso a
--      TUDO no banco imediatamente (toda política de RLS depende dessa
--      função), mesmo que a sessão dele ainda esteja "logada" no browser.
--   4) set_member_active() e set_logistics_permissions(): RPCs novas,
--      exclusivas de admin/master.
--
-- Rode isto no SQL Editor DEPOIS de cadastro-completo-migration.sql.
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

alter table drivers add column if not exists active boolean not null default true;
alter table representatives add column if not exists active boolean not null default true;
alter table logistics_users add column if not exists active boolean not null default true;
alter table logistics_users add column if not exists permissions jsonb not null default '{"importador": true, "rotas": true, "fretes": true, "frota": true, "rotasProdutos": true}'::jsonb;

-- --------------------------------------------------------------------------
-- current_profile(): mesma assinatura de sempre (role, companyId, id, name),
-- só que agora um usuário inativado não aparece mais aqui — e como toda
-- política de RLS do sistema chama essa função pra saber "quem é o caller",
-- isso barra ele em tudo (select/insert/update/delete) de uma vez só.
-- --------------------------------------------------------------------------
create or replace function public.current_profile()
returns table (role text, "companyId" uuid, id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select 'master', null::uuid, id, name from master_users where "authUserId" = auth.uid()
  union all
  select 'admin', "companyId", id, name from admins where "authUserId" = auth.uid()
  union all
  select 'logistics', "companyId", id, name from logistics_users where "authUserId" = auth.uid() and active = true
  union all
  select 'driver', "companyId", id, name from drivers where "authUserId" = auth.uid() and active = true
  union all
  select 'representative', "companyId", id, name from representatives where "authUserId" = auth.uid() and active = true
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- current_logistics_permissions(): função separada (não mexe na assinatura
-- de current_profile, que é usada em toda política de RLS) só pro app saber
-- quais módulos esconder do menu da Logística logada.
-- --------------------------------------------------------------------------
create or replace function public.current_logistics_permissions()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select permissions from logistics_users where "authUserId" = auth.uid();
$$;
grant execute on function public.current_logistics_permissions() to authenticated;

-- --------------------------------------------------------------------------
-- set_member_active(): ativa/inativa driver, representative ou logistics.
-- Exclusivo de admin (só na própria empresa) e master (qualquer empresa).
-- --------------------------------------------------------------------------
create or replace function public.set_member_active(p_role text, p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  target_company uuid;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master') then
    raise exception 'Sem permissão para ativar/inativar usuários.';
  end if;
  if p_role not in ('driver', 'representative', 'logistics') then
    raise exception 'Tipo de usuário inválido.';
  end if;

  if p_role = 'driver' then
    select "companyId" into target_company from drivers where id = p_id;
  elsif p_role = 'representative' then
    select "companyId" into target_company from representatives where id = p_id;
  else
    select "companyId" into target_company from logistics_users where id = p_id;
  end if;

  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para alterar este usuário.';
  end if;

  if p_role = 'driver' then
    update drivers set active = p_active where id = p_id;
  elsif p_role = 'representative' then
    update representatives set active = p_active where id = p_id;
  else
    update logistics_users set active = p_active where id = p_id;
  end if;
end;
$$;
grant execute on function public.set_member_active(text, uuid, boolean) to authenticated;

-- --------------------------------------------------------------------------
-- set_logistics_permissions(): define os módulos liberados pra uma pessoa
-- específica da Logística. Exclusivo de admin/master.
-- --------------------------------------------------------------------------
create or replace function public.set_logistics_permissions(p_id uuid, p_permissions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  target_company uuid;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master') then
    raise exception 'Sem permissão para gerenciar acessos.';
  end if;

  select "companyId" into target_company from logistics_users where id = p_id;
  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para alterar este usuário.';
  end if;

  update logistics_users set permissions = p_permissions where id = p_id;
end;
$$;
grant execute on function public.set_logistics_permissions(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
