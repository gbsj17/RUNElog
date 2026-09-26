-- ==========================================================================
-- RUNElog: Logística passa a poder cadastrar/remover/editar PIN de
-- motoristas e representantes.
--
-- O perfil "logistics" (logistics-role-migration.sql) reaproveita a mesma
-- tela do Admin (rotas, fretes, frota) — inclusive os formulários "Novo
-- Motorista" e "Novo Representante". Só que create_team_member(),
-- delete_team_member() e set_member_pin() nunca foram atualizadas pra
-- aceitar 'logistics' como quem chama: o formulário abre, mas ao salvar
-- o Supabase recusa com "Sem permissão...". Esse script corrige isso —
-- Logística só pode mexer em driver/representative, nunca em admin ou
-- em outro logistics (isso continua exclusivo de admin/master, como a
-- documentação do sistema pede: "Logística... Não gerencia permissões e
-- licenças").
--
-- Rode isto no SQL Editor DEPOIS de logistics-role-migration.sql.
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

create or replace function public.create_team_member(
  p_role text, p_name text, p_pin text, p_cpf text default null, p_phone text default null,
  p_company_id uuid default null
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

  new_auth_id := public._runelog_create_auth_user(new_email, p_pin);

  if p_role = 'driver' then
    insert into drivers (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'representative' then
    insert into representatives (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'logistics' then
    insert into logistics_users (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  else
    insert into admins (id, name, pin, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, target_company, new_auth_id, new_email, extract(epoch from now())*1000);
  end if;

  return new_row_id;
end;
$$;

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
  if caller.role not in ('admin', 'master', 'logistics') then
    raise exception 'Sem permissão para remover usuários.';
  end if;
  if caller.role = 'logistics' and p_role not in ('driver', 'representative') then
    raise exception 'Logística só pode remover motoristas e representantes.';
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
    or (caller.role = 'logistics' and caller."companyId" = target_company and p_role in ('driver', 'representative'))
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

notify pgrst, 'reload schema';
