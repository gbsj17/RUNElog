-- ==========================================================================
-- RUNElog: Master cria o Admin de uma empresa pelo próprio app.
--
-- Hoje "Cadastrar Nova Empresa" (admin-tenants.js) só grava a linha em
-- `companies` — não existe nenhuma forma, dentro do app, de criar o login
-- do Admin dessa empresa. A única via era bootstrap_admin(), que não tem
-- grant pra anon/authenticated (só roda manualmente no SQL Editor, logado
-- como dono do banco). Esse script fecha essa lacuna: estende
-- create_team_member() pra aceitar p_company_id — usado só quando quem
-- chama é o master, pra apontar em qual empresa o novo admin entra.
-- admin/logistics continuam usando a própria empresa (companyId do
-- caller), sem chance de criar usuário em empresa alheia.
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
  if caller.role not in ('admin', 'master') then
    raise exception 'Sem permissão para criar usuários.';
  end if;
  if p_role not in ('driver', 'representative', 'admin', 'logistics') then
    raise exception 'Tipo de usuário inválido.';
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

notify pgrst, 'reload schema';
