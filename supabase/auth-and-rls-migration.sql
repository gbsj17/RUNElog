-- ==========================================================================
-- RUNElog: migração para login via Supabase Auth + RLS real por empresa
-- ==========================================================================
-- Rode isto no SQL Editor do Supabase DEPOIS de schema.sql e backfill-fibrasol.sql.
-- Idempotente: seguro rodar de novo (usa "create or replace" e "if not exists").
--
-- IMPORTANTE — teste antes de valer pra todo mundo:
--   1. Rode este script inteiro.
--   2. Rode a seção "BACKFILL" no fim só depois de conferir que o login de um
--      usuário de teste (crie um admin novo pelo app) está funcionando.
--   3. Só depois disso, rode o backfill pros usuários que já existem.
--
-- O que muda:
--   - Login deixa de comparar PIN em texto puro no navegador. Agora ele usa o
--     Supabase Auth de verdade (e-mail + senha), com um e-mail técnico gerado
--     por trás ("nome@runelog.interno") — o usuário continua digitando só
--     nome + PIN na tela, nada muda pra ele.
--   - As políticas de RLS deixam de ser "acesso aberto" e passam a checar a
--     empresa (companyId) do usuário autenticado.
-- ==========================================================================

-- No Supabase, pgcrypto normalmente já vem instalada no schema "extensions",
-- não em "public" — por isso crypt()/gen_salt() sem qualificar dão "does not
-- exist" mesmo com a extensão presente. As funções abaixo que usam essas
-- funções (_runelog_create_auth_user, _runelog_set_auth_password) por isso
-- incluem "extensions" no próprio search_path fixo delas.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgcrypto;

alter table admins add column if not exists "authUserId" uuid unique;
alter table admins add column if not exists email text unique;
alter table drivers add column if not exists "authUserId" uuid unique;
alter table drivers add column if not exists email text unique;
alter table representatives add column if not exists "authUserId" uuid unique;
alter table representatives add column if not exists email text unique;
alter table master_users add column if not exists "authUserId" uuid unique;
alter table master_users add column if not exists email text unique;

-- --------------------------------------------------------------------------
-- Funções internas (criam/alteram/apagam usuários no auth.users diretamente).
-- Rodam com privilégio de dono (security definer) — só chamadas por outras
-- funções deste arquivo, nunca direto pelo client.
-- --------------------------------------------------------------------------

create or replace function public._runelog_create_auth_user(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  new_id uuid := gen_random_uuid();
  inst_id uuid;
begin
  select instance_id into inst_id from auth.users limit 1;
  if inst_id is null then inst_id := '00000000-0000-0000-0000-000000000000'; end if;

  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
     confirmation_token, recovery_token, email_change, email_change_token_new,
     is_super_admin, confirmed_at)
  values
    (new_id, inst_id, 'authenticated', 'authenticated', p_email,
     crypt(p_password, gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
     '', '', '', '', false, now());

  insert into auth.identities
    (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), new_id, new_id::text,
     jsonb_build_object('sub', new_id::text, 'email', p_email), 'email', now(), now(), now());

  return new_id;
end;
$$;

create or replace function public._runelog_set_auth_password(p_auth_user_id uuid, p_new_password text)
returns void
language sql
security definer
set search_path = auth, public, extensions
as $$
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where id = p_auth_user_id;
$$;

create or replace function public._runelog_delete_auth_user(p_auth_user_id uuid)
returns void
language sql
security definer
set search_path = auth, public
as $$
  delete from auth.identities where user_id = p_auth_user_id;
  delete from auth.users where id = p_auth_user_id;
$$;

-- Gera um e-mail técnico único a partir do nome (o usuário nunca vê/usa isso).
create or replace function public._runelog_synthetic_email(p_name text)
returns text
language sql
volatile
as $$
  select lower(regexp_replace(coalesce(p_name, 'user'), '[^a-zA-Z0-9]+', '.', 'g'))
    || '.' || substr(gen_random_uuid()::text, 1, 6) || '@runelog.interno';
$$;

-- --------------------------------------------------------------------------
-- Perfil do usuário autenticado: descobre role/empresa a partir do auth.uid().
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
  select 'driver', "companyId", id, name from drivers where "authUserId" = auth.uid()
  union all
  select 'representative', "companyId", id, name from representatives where "authUserId" = auth.uid()
  limit 1;
$$;

grant execute on function public.current_profile() to authenticated;

-- --------------------------------------------------------------------------
-- RPCs usadas pelo app (login, criação/edição/remoção de usuários).
-- --------------------------------------------------------------------------

-- Login passo 1: dado o nome digitado, devolve o e-mail técnico correspondente
-- (nunca o PIN). O client então chama supabase.auth.signInWithPassword com
-- esse e-mail e o PIN digitado, e o próprio Supabase Auth valida a senha.
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
    select email, 3 from drivers where lower(name) = lower(p_name)
    union all
    select email, 4 from representatives where lower(name) = lower(p_name)
  ) t
  order by prio
  limit 1;
$$;

grant execute on function public.login_email_for(text) to anon, authenticated;

-- Cria um motorista/representante/admin dentro da empresa de quem está chamando.
-- p_role: 'driver' | 'representative' | 'admin'
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
  if p_role not in ('driver', 'representative', 'admin') then
    raise exception 'Tipo de usuário inválido.';
  end if;

  new_auth_id := public._runelog_create_auth_user(new_email, p_pin);

  if p_role = 'driver' then
    insert into drivers (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  elsif p_role = 'representative' then
    insert into representatives (id, name, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, p_cpf, p_phone, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  else
    insert into admins (id, name, pin, "companyId", "authUserId", email, "createdAt")
    values (new_row_id, p_name, p_pin, caller."companyId", new_auth_id, new_email, extract(epoch from now())*1000);
  end if;

  return new_row_id;
end;
$$;

grant execute on function public.create_team_member(text, text, text, text, text) to authenticated;

-- Troca o PIN de um usuário: a própria pessoa, ou um admin/master da mesma empresa.
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
  else
    update admins set pin = p_new_pin where id = p_id;
  end if;
end;
$$;

grant execute on function public.set_member_pin(text, uuid, text) to authenticated;

-- Remove um motorista/representante/admin (e o respectivo login).
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
  else
    delete from admins where id = p_id;
  end if;

  if target_auth_id is not null then
    perform public._runelog_delete_auth_user(target_auth_id);
  end if;
end;
$$;

grant execute on function public.delete_team_member(text, uuid) to authenticated;

-- Bootstrap: cria o primeiro admin de uma empresa. NÃO é liberada pro app
-- (sem grant pra anon/authenticated) — só roda aqui no SQL Editor, logado
-- como você (postgres). É o substituto seguro da antiga porta dos fundos:
-- uso: select public.bootstrap_admin('Nome da Empresa', 'nome_do_admin', '1234');
create or replace function public.bootstrap_admin(p_company_name text, p_name text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company uuid;
  new_row_id uuid := gen_random_uuid();
  new_email text := public._runelog_synthetic_email(p_name);
  new_auth_id uuid;
begin
  select id into target_company from companies where name = p_company_name;
  if target_company is null then
    raise exception 'Empresa "%" não encontrada em companies.', p_company_name;
  end if;

  new_auth_id := public._runelog_create_auth_user(new_email, p_pin);

  insert into admins (id, name, pin, "companyId", "authUserId", email, "createdAt")
  values (new_row_id, p_name, p_pin, target_company, new_auth_id, new_email, extract(epoch from now())*1000);

  return new_row_id;
end;
$$;

-- --------------------------------------------------------------------------
-- RLS: troca as políticas "allow all anon" por políticas escopadas por empresa.
-- --------------------------------------------------------------------------

drop policy if exists "allow all anon" on admins;
drop policy if exists "allow all anon" on drivers;
drop policy if exists "allow all anon" on representatives;
drop policy if exists "allow all anon" on routes;
drop policy if exists "allow all anon" on settings;
drop policy if exists "allow all anon" on companies;
drop policy if exists "allow all anon" on master_users;

-- admins: veem/editam a própria empresa; cada um vê a própria linha.
create policy "select same company or self" on admins for select using (
  "authUserId" = auth.uid()
  or (select "companyId" from public.current_profile()) = "companyId"
  or (select role from public.current_profile()) = 'master'
);
create policy "update same company or self" on admins for update using (
  "authUserId" = auth.uid()
  or ((select role from public.current_profile()) in ('admin', 'master') and (select "companyId" from public.current_profile()) = "companyId")
);

create policy "select same company or self" on drivers for select using (
  "authUserId" = auth.uid()
  or (select "companyId" from public.current_profile()) = "companyId"
  or (select role from public.current_profile()) = 'master'
);
create policy "update same company or self" on drivers for update using (
  "authUserId" = auth.uid()
  or ((select role from public.current_profile()) in ('admin', 'master') and (select "companyId" from public.current_profile()) = "companyId")
);

create policy "select same company or self" on representatives for select using (
  "authUserId" = auth.uid()
  or (select "companyId" from public.current_profile()) = "companyId"
  or (select role from public.current_profile()) = 'master'
);
create policy "update same company or self" on representatives for update using (
  "authUserId" = auth.uid()
  or ((select role from public.current_profile()) in ('admin', 'master') and (select "companyId" from public.current_profile()) = "companyId")
);

-- master_users: cada master só vê/edita a própria linha (criação/remoção ficam
-- de fora deste PR — continue cadastrando novos masters manualmente no painel).
create policy "select self" on master_users for select using ("authUserId" = auth.uid());
create policy "update self" on master_users for update using ("authUserId" = auth.uid());

-- companies: master vê todas; admin/driver/rep só a própria.
create policy "select own company or master" on companies for select using (
  (select role from public.current_profile()) = 'master'
  or id = (select "companyId" from public.current_profile())
);
create policy "master manages companies" on companies for insert with check (
  (select role from public.current_profile()) = 'master'
);
create policy "master updates companies" on companies for update using (
  (select role from public.current_profile()) = 'master'
);

-- routes: escopadas por empresa; master vê tudo.
create policy "company scoped routes" on routes for all using (
  (select role from public.current_profile()) = 'master'
  or (select "companyId" from public.current_profile()) = "companyId"
) with check (
  (select role from public.current_profile()) = 'master'
  or (select "companyId" from public.current_profile()) = "companyId"
);

-- settings: legado, baixo uso — restringe a admin/master.
create policy "admin or master reads settings" on settings for select using (
  (select role from public.current_profile()) in ('admin', 'master')
);
create policy "admin or master writes settings" on settings for all using (
  (select role from public.current_profile()) in ('admin', 'master')
);

notify pgrst, 'reload schema';

-- ==========================================================================
-- BACKFILL — rode só depois de validar o cadastro de um usuário de teste.
-- Cria o login (auth.users) para quem já existe nas tabelas e ainda não tem
-- authUserId. Usa o PIN atual de cada um como senha inicial.
-- Seguro rodar de novo: pula quem já tem authUserId.
-- ==========================================================================

do $$
declare
  r record;
  new_auth_id uuid;
  new_email text;
begin
  for r in select id, name, pin from master_users where "authUserId" is null loop
    new_email := public._runelog_synthetic_email(r.name);
    new_auth_id := public._runelog_create_auth_user(new_email, r.pin);
    update master_users set "authUserId" = new_auth_id, email = new_email where id = r.id;
  end loop;

  for r in select id, name, pin from admins where "authUserId" is null loop
    new_email := public._runelog_synthetic_email(r.name);
    new_auth_id := public._runelog_create_auth_user(new_email, r.pin);
    update admins set "authUserId" = new_auth_id, email = new_email where id = r.id;
  end loop;

  for r in select id, name, pin from drivers where "authUserId" is null loop
    new_email := public._runelog_synthetic_email(r.name);
    new_auth_id := public._runelog_create_auth_user(new_email, r.pin);
    update drivers set "authUserId" = new_auth_id, email = new_email where id = r.id;
  end loop;

  for r in select id, name, pin from representatives where "authUserId" is null loop
    new_email := public._runelog_synthetic_email(r.name);
    new_auth_id := public._runelog_create_auth_user(new_email, r.pin);
    update representatives set "authUserId" = new_auth_id, email = new_email where id = r.id;
  end loop;
end $$;
