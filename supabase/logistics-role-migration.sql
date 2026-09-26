-- ==========================================================================
-- RUNElog: perfil "Funcionário de Logística" (logistics).
--
-- Hoje quem cadastra motoristas/veículos/rotas/produtos e faz a
-- roteirização é o próprio Admin. Este script separa isso num perfil
-- próprio (logistics), criado pelo Admin, com login e RLS independentes
-- — espelhando exatamente o que já existe para drivers/representatives.
--
-- Rode isto no SQL Editor DEPOIS de auth-and-rls-migration.sql e
-- fix-routes-rls-migration.sql. Idempotente: seguro rodar de novo.
-- ==========================================================================

create table if not exists logistics_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  cpf text,
  phone text,
  "companyId" uuid references companies(id),
  "authUserId" uuid unique,
  email text unique,
  "createdAt" bigint
);

alter table logistics_users enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'logistics_users'
  ) then
    execute 'alter publication supabase_realtime add table logistics_users';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- current_profile(): passa a reconhecer também logistics_users.
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
  select 'logistics', "companyId", id, name from logistics_users where "authUserId" = auth.uid()
  union all
  select 'driver', "companyId", id, name from drivers where "authUserId" = auth.uid()
  union all
  select 'representative', "companyId", id, name from representatives where "authUserId" = auth.uid()
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- login_email_for(): inclui logistics_users na busca do e-mail técnico.
-- --------------------------------------------------------------------------
create or replace function public.login_email_for(p_name text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from (
    select email, 1 as prio from master_users where lower(name) = lower(p_name)
    union all
    select email, 2 from admins where lower(name) = lower(p_name)
    union all
    select email, 3 from logistics_users where lower(name) = lower(p_name)
    union all
    select email, 4 from drivers where lower(name) = lower(p_name)
    union all
    select email, 5 from representatives where lower(name) = lower(p_name)
  ) t
  order by prio
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- create_team_member(): aceita 'logistics'. Só admin/master criam (a
-- Logística não cadastra outra Logística nem se autopromove).
-- --------------------------------------------------------------------------
create or replace function public.create_team_member(
  p_role text, p_name text, p_pin text, p_cpf text default null, p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  new_row_id uuid := gen_random_uuid();
  new_email text := public._runelog_synthetic_email(p_name);
  new_auth_id uuid;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master') then
    raise exception 'Sem permissão para criar usuários.';
  end if;
  if p_role not in ('driver', 'representative', 'admin', 'logistics') then
    raise exception 'Tipo de usuário inválido.';
  end if;

  new_auth_id := public._runelog_create_auth_user(new_email, p_pin);

  if p_role = 'driver' then
    insert into drivers (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'representative' then
    insert into representatives (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'logistics' then
    insert into logistics_users (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  else
    insert into admins (id, name, pin, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  end if;

  return new_row_id;
end;
$$;

-- --------------------------------------------------------------------------
-- set_member_pin(): aceita 'logistics'.
-- --------------------------------------------------------------------------
create or replace function public.set_member_pin(p_role text, p_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  target_auth_id uuid;
  target_company uuid;
begin
  select * into caller from public.current_profile();

  if p_role = 'driver' then
    select "authUserId", "companyId" into target_auth_id, target_company from drivers where id = p_id;
  elsif p_role = 'representative' then
    select "authUserId", "companyId" into target_auth_id, target_company from representatives where id = p_id;
  elsif p_role = 'logistics' then
    select "authUserId", "companyId" into target_auth_id, target_company from logistics_users where id = p_id;
  elsif p_role = 'admin' then
    select "authUserId", "companyId" into target_auth_id, target_company from admins where id = p_id;
  else
    raise exception 'Tipo de usuário inválido.';
  end if;

  if target_auth_id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if not (
    target_auth_id = auth.uid()
    or (caller.role in ('admin', 'master') and caller."companyId" = target_company)
    or caller.role = 'master'
  ) then
    raise exception 'Sem permissão para alterar este PIN.';
  end if;

  perform public._runelog_set_auth_password(target_auth_id, p_new_pin);

  if p_role = 'driver' then
    update drivers set pin = p_new_pin where id = p_id;
  elsif p_role = 'representative' then
    update representatives set pin = p_new_pin where id = p_id;
  elsif p_role = 'logistics' then
    update logistics_users set pin = p_new_pin where id = p_id;
  else
    update admins set pin = p_new_pin where id = p_id;
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- delete_team_member(): aceita 'logistics'.
-- --------------------------------------------------------------------------
create or replace function public.delete_team_member(p_role text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  target_auth_id uuid;
  target_company uuid;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master') then
    raise exception 'Sem permissão para remover usuários.';
  end if;

  if p_role = 'driver' then
    select "authUserId", "companyId" into target_auth_id, target_company from drivers where id = p_id;
  elsif p_role = 'representative' then
    select "authUserId", "companyId" into target_auth_id, target_company from representatives where id = p_id;
  elsif p_role = 'logistics' then
    select "authUserId", "companyId" into target_auth_id, target_company from logistics_users where id = p_id;
  elsif p_role = 'admin' then
    select "authUserId", "companyId" into target_auth_id, target_company from admins where id = p_id;
  else
    raise exception 'Tipo de usuário inválido.';
  end if;

  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para remover este usuário.';
  end if;

  if p_role = 'driver' then
    delete from drivers where id = p_id;
  elsif p_role = 'representative' then
    delete from representatives where id = p_id;
  elsif p_role = 'logistics' then
    delete from logistics_users where id = p_id;
  else
    delete from admins where id = p_id;
  end if;

  if target_auth_id is not null then
    perform public._runelog_delete_auth_user(target_auth_id);
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- RLS: mesmo padrão de admins/drivers/representatives.
-- --------------------------------------------------------------------------
drop policy if exists "select same company or self" on logistics_users;
create policy "select same company or self" on logistics_users for select using (
  "authUserId" = auth.uid()
  or (select "companyId" from public.current_profile()) = "companyId"
  or (select role from public.current_profile()) = 'master'
);

drop policy if exists "update same company or self" on logistics_users;
create policy "update same company or self" on logistics_users for update using (
  "authUserId" = auth.uid()
  or ((select role from public.current_profile()) in ('admin', 'master') and (select "companyId" from public.current_profile()) = "companyId")
);

notify pgrst, 'reload schema';
