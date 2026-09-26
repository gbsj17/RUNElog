-- ==========================================================================
-- RUNElog: cadastro completo — nome completo separado do usuário de login,
-- código sequencial por empresa (adm 0001, log 0001, mot 0001, rep 0001),
-- tabela real de veículos, e edição de cadastros.
--
-- Rode isto no SQL Editor DEPOIS de logistics-can-manage-team-migration.sql.
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- "name" continua sendo o usuário de login (nada muda no login_email_for/
-- current_profile). "fullName" é só o nome completo pra exibição. "code" é
-- o identificador sequencial (adm 0001 etc.), gerado no servidor.
-- --------------------------------------------------------------------------
alter table admins add column if not exists "fullName" text;
alter table admins add column if not exists code text;
alter table drivers add column if not exists "fullName" text;
alter table drivers add column if not exists code text;
alter table representatives add column if not exists "fullName" text;
alter table representatives add column if not exists code text;
alter table logistics_users add column if not exists "fullName" text;
alter table logistics_users add column if not exists code text;

-- Usuário de login não pode repetir dentro da mesma empresa (case-insensitive).
-- Se já existir duplicidade nos dados atuais, este create index falha — rode
-- uma consulta pra achar e renomear os duplicados antes de tentar de novo.
create unique index if not exists admins_company_username_uniq on admins (lower(name), "companyId");
create unique index if not exists drivers_company_username_uniq on drivers (lower(name), "companyId");
create unique index if not exists representatives_company_username_uniq on representatives (lower(name), "companyId");
create unique index if not exists logistics_users_company_username_uniq on logistics_users (lower(name), "companyId");

-- --------------------------------------------------------------------------
-- Contador de código sequencial por empresa + tipo. Uma linha por
-- (companyId, entityType); next_sequence_code() incrementa e devolve
-- formatado, tudo numa transação atômica (upsert com row lock), então dois
-- cadastros simultâneos nunca saem com o mesmo número.
-- --------------------------------------------------------------------------
create table if not exists company_sequences (
  "companyId" uuid not null,
  "entityType" text not null,
  "lastNumber" integer not null default 0,
  primary key ("companyId", "entityType")
);

alter table company_sequences enable row level security;
drop policy if exists "leitura da propria empresa ou master" on company_sequences;
create policy "leitura da propria empresa ou master" on company_sequences for select using (
  (select role from public.current_profile()) = 'master'
  or (select "companyId" from public.current_profile()) = "companyId"
);

create or replace function public.next_sequence_code(p_company_id uuid, p_entity_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_numero integer;
begin
  insert into company_sequences ("companyId", "entityType", "lastNumber")
  values (p_company_id, p_entity_type, 1)
  on conflict ("companyId", "entityType")
  do update set "lastNumber" = company_sequences."lastNumber" + 1
  returning "lastNumber" into novo_numero;

  return p_prefix || ' ' || lpad(novo_numero::text, 4, '0');
end;
$$;

-- --------------------------------------------------------------------------
-- Veículos: tabela real (antes só existia como array em memória no
-- navegador — abrirModalNovoVeiculo/renderlogVehiclesList em log-core.js).
-- --------------------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id),
  code text,
  placa text not null,
  tipo text,
  carroceria text,
  grade text,
  eixos integer,
  reboque text,
  "driverId" uuid references drivers(id) on delete set null,
  "createdAt" bigint
);

alter table vehicles enable row level security;

-- Só select por RLS direto (usado pelo realtime/subscribeTable). Criar,
-- editar e remover só passam pelas RPCs abaixo (security definer, checam
-- licença e geram o código) — mesmo padrão já usado pra drivers/admins/
-- representatives/logistics_users, que também não têm policy de insert
-- direta.
drop policy if exists "select same company or master" on vehicles;
create policy "select same company or master" on vehicles for select using (
  (select role from public.current_profile()) = 'master'
  or (select "companyId" from public.current_profile()) = "companyId"
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'vehicles'
  ) then
    execute 'alter publication supabase_realtime add table vehicles';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- Limites de licença por empresa. "planLimits" guarda quantos de cada tipo
-- a empresa pode ter (admins/logistics/drivers/representatives/vehicles).
-- Para os planos fechados (básico/profissional/corporativo) o client
-- preenche com os valores do catálogo ao criar a empresa; no
-- "personalizado" o próprio master define os números.
-- --------------------------------------------------------------------------
alter table companies add column if not exists "planLimits" jsonb default '{"admins": 1, "logistics": 2, "drivers": 15, "representatives": 5, "vehicles": 20}'::jsonb;

-- --------------------------------------------------------------------------
-- Conta quantos registros de cada tipo a empresa já tem (usado pelo client
-- pra mostrar "licenças restantes" sem precisar buscar as 5 tabelas à parte).
-- --------------------------------------------------------------------------
create or replace function public.company_license_usage(p_company_id uuid)
returns table (admins bigint, logistics bigint, drivers bigint, representatives bigint, vehicles bigint)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*) from admins where "companyId" = p_company_id),
    (select count(*) from logistics_users where "companyId" = p_company_id),
    (select count(*) from drivers where "companyId" = p_company_id),
    (select count(*) from representatives where "companyId" = p_company_id),
    (select count(*) from vehicles where "companyId" = p_company_id);
$$;

grant execute on function public.company_license_usage(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- create_team_member: agora recebe p_full_name, gera o code sequencial, e
-- bloqueia o cadastro se a empresa já estourou a licença daquele tipo.
-- --------------------------------------------------------------------------
create or replace function public.create_team_member(
  p_role text, p_name text, p_pin text, p_cpf text default null, p_phone text default null,
  p_company_id uuid default null, p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  target_company uuid;
  new_row_id uuid := gen_random_uuid();
  new_email text := public._runelog_synthetic_email(p_name);
  new_auth_id uuid;
  limits jsonb;
  current_count bigint;
  limit_key text;
  new_code text;
  code_prefix text;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para criar usuários.';
  end if;
  if p_role not in ('driver', 'representative', 'admin', 'logistics') then
    raise exception 'Tipo de usuário inválido.';
  end if;
  if caller.role = 'logistics' and p_role not in ('driver', 'representative') then
    raise exception 'Logística só pode cadastrar motoristas e representantes.';
  end if;

  if caller.role = 'master' then
    if p_company_id is null then
      raise exception 'Informe a empresa (p_company_id) para o master criar este usuário.';
    end if;
    target_company := p_company_id;
  else
    target_company := caller."companyId";
  end if;

  limit_key := case p_role
    when 'admin' then 'admins'
    when 'logistics' then 'logistics'
    when 'driver' then 'drivers'
    else 'representatives'
  end;
  code_prefix := case p_role
    when 'admin' then 'adm'
    when 'logistics' then 'log'
    when 'driver' then 'mot'
    else 'rep'
  end;

  select "planLimits" into limits from companies where id = target_company;
  if limits is not null and limits ? limit_key then
    select case p_role
      when 'admin' then (select count(*) from admins where "companyId" = target_company)
      when 'logistics' then (select count(*) from logistics_users where "companyId" = target_company)
      when 'driver' then (select count(*) from drivers where "companyId" = target_company)
      else (select count(*) from representatives where "companyId" = target_company)
    end into current_count;

    if current_count >= (limits->>limit_key)::int then
      raise exception 'Limite de licenças atingido para este tipo de usuário no plano atual da empresa.';
    end if;
  end if;

  new_code := public.next_sequence_code(target_company, p_role, code_prefix);
  new_auth_id := public._runelog_create_auth_user(new_email, p_pin);

  if p_role = 'driver' then
    insert into drivers (id, name, "fullName", code, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, coalesce(p_full_name, p_name), new_code, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'representative' then
    insert into representatives (id, name, "fullName", code, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, coalesce(p_full_name, p_name), new_code, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'logistics' then
    insert into logistics_users (id, name, "fullName", code, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, coalesce(p_full_name, p_name), new_code, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  else
    insert into admins (id, name, "fullName", code, pin, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, coalesce(p_full_name, p_name), new_code, p_pin, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  end if;

  return new_row_id;
exception
  when unique_violation then
    raise exception 'Já existe um usuário com esse nome de login nesta empresa.';
end;
$$;

-- --------------------------------------------------------------------------
-- update_team_member: edita nome completo/usuário/CPF/telefone (a senha
-- continua trocando só pelo modal "Gerenciar Credenciais" / set_member_pin).
-- --------------------------------------------------------------------------
create or replace function public.update_team_member(
  p_role text, p_id uuid, p_name text, p_full_name text default null, p_cpf text default null, p_phone text default null
)
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
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para editar usuários.';
  end if;
  if caller.role = 'logistics' and p_role not in ('driver', 'representative') then
    raise exception 'Logística só pode editar motoristas e representantes.';
  end if;
  if p_role not in ('driver', 'representative', 'admin', 'logistics') then
    raise exception 'Tipo de usuário inválido.';
  end if;

  if p_role = 'driver' then
    select "companyId" into target_company from drivers where id = p_id;
  elsif p_role = 'representative' then
    select "companyId" into target_company from representatives where id = p_id;
  elsif p_role = 'logistics' then
    select "companyId" into target_company from logistics_users where id = p_id;
  else
    select "companyId" into target_company from admins where id = p_id;
  end if;

  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para editar este usuário.';
  end if;

  if p_role = 'driver' then
    update drivers set name = p_name, "fullName" = coalesce(p_full_name, p_name), cpf = p_cpf, phone = p_phone where id = p_id;
  elsif p_role = 'representative' then
    update representatives set name = p_name, "fullName" = coalesce(p_full_name, p_name), cpf = p_cpf, phone = p_phone where id = p_id;
  elsif p_role = 'logistics' then
    update logistics_users set name = p_name, "fullName" = coalesce(p_full_name, p_name), cpf = p_cpf, phone = p_phone where id = p_id;
  else
    update admins set name = p_name, "fullName" = coalesce(p_full_name, p_name) where id = p_id;
  end if;
exception
  when unique_violation then
    raise exception 'Já existe um usuário com esse nome de login nesta empresa.';
end;
$$;

grant execute on function public.update_team_member(text, uuid, text, text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- Veículos: create/update/delete via RPC (mesma checagem de licença e
-- código sequencial dos usuários).
-- --------------------------------------------------------------------------
create or replace function public.create_vehicle(
  p_placa text, p_tipo text default null, p_carroceria text default null, p_driver_id uuid default null,
  p_grade text default null, p_eixos integer default null, p_reboque text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller record;
  limits jsonb;
  current_count bigint;
  new_row_id uuid := gen_random_uuid();
  new_code text;
begin
  select * into caller from public.current_profile();
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para cadastrar veículos.';
  end if;
  if caller."companyId" is null then
    raise exception 'Usuário sem empresa vinculada.';
  end if;

  select "planLimits" into limits from companies where id = caller."companyId";
  if limits is not null and limits ? 'vehicles' then
    select count(*) into current_count from vehicles where "companyId" = caller."companyId";
    if current_count >= (limits->>'vehicles')::int then
      raise exception 'Limite de licenças de veículos atingido no plano atual da empresa.';
    end if;
  end if;

  new_code := public.next_sequence_code(caller."companyId", 'vehicle', 'vei');

  insert into vehicles (id, "companyId", code, placa, tipo, carroceria, grade, eixos, reboque, "driverId", "createdAt")
  values (new_row_id, caller."companyId", new_code, p_placa, p_tipo, p_carroceria, p_grade, p_eixos, p_reboque, p_driver_id, extract(epoch from now())*1000);

  return new_row_id;
end;
$$;

grant execute on function public.create_vehicle(text, text, text, uuid, text, integer, text) to authenticated;

create or replace function public.update_vehicle(
  p_id uuid, p_placa text, p_tipo text default null, p_carroceria text default null, p_driver_id uuid default null,
  p_grade text default null, p_eixos integer default null, p_reboque text default null
)
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
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para editar veículos.';
  end if;

  select "companyId" into target_company from vehicles where id = p_id;
  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para editar este veículo.';
  end if;

  update vehicles set placa = p_placa, tipo = p_tipo, carroceria = p_carroceria, grade = p_grade, eixos = p_eixos, reboque = p_reboque, "driverId" = p_driver_id where id = p_id;
end;
$$;

grant execute on function public.update_vehicle(uuid, text, text, text, uuid, text, integer, text) to authenticated;

create or replace function public.delete_vehicle(p_id uuid)
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
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para remover veículos.';
  end if;

  select "companyId" into target_company from vehicles where id = p_id;
  if not (caller.role = 'master' or caller."companyId" = target_company) then
    raise exception 'Sem permissão para remover este veículo.';
  end if;

  delete from vehicles where id = p_id;
end;
$$;

grant execute on function public.delete_vehicle(uuid) to authenticated;

notify pgrst, 'reload schema';
