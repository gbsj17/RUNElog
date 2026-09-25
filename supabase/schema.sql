-- RUNElog: schema Supabase (Postgres) equivalente às coleções do Firestore.
-- Rode isto no SQL Editor do painel do Supabase antes de usar o app.

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  "createdAt" bigint
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  cpf text,
  phone text,
  "createdAt" bigint
);

create table if not exists representatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  cpf text,
  phone text,
  "createdAt" bigint
);

-- Caso as tabelas já existam de uma execução anterior deste script:
alter table drivers add column if not exists cpf text;
alter table drivers add column if not exists phone text;
alter table representatives add column if not exists cpf text;
alter table representatives add column if not exists phone text;

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  "driverId" uuid,
  "driverName" text,
  "repId" uuid,
  "repName" text,
  representantes jsonb default '[]',
  "numeroCarga" text,
  stops jsonb default '[]',
  "rawUrl" text,
  "createdAt" bigint,
  "startedAt" bigint,
  "finishedAt" bigint,
  status text default 'active'
);

create table if not exists settings (
  key text primary key,
  value jsonb
);

-- ==========================================================
-- RUNEmaster: multi-tenant (SaaS)
-- ==========================================================

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'basico',
  status text default 'active', -- 'active' | 'trial' | 'suspended'
  features jsonb default '{"fretes": true, "rotasProdutos": true}',
  "createdAt" bigint
);

create table if not exists master_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  "createdAt" bigint
);

alter table admins add column if not exists "companyId" uuid references companies(id);
alter table drivers add column if not exists "companyId" uuid references companies(id);
alter table representatives add column if not exists "companyId" uuid references companies(id);
alter table routes add column if not exists "companyId" uuid references companies(id);

-- Cadastro completo de empresa + dados comerciais da assinatura
alter table companies add column if not exists "razaoSocial" text;
alter table companies add column if not exists cnpj text;
alter table companies add column if not exists cep text;
alter table companies add column if not exists logradouro text;
alter table companies add column if not exists numero text;
alter table companies add column if not exists bairro text;
alter table companies add column if not exists cidade text;
alter table companies add column if not exists uf text;
alter table companies add column if not exists "planValue" numeric;
alter table companies add column if not exists "billingCycle" text default 'mensal';
alter table companies add column if not exists phone text;

-- RLS: acesso aberto para o anon key, equivalente ao Firestore em modo teste.
-- Mantém a mesma postura de segurança atual do app (fora de escopo endurecer agora).
-- Nota: o isolamento entre empresas é feito por filtro companyId nas queries do client,
-- não por política de banco (limite de segurança consciente, documentado no plano da tarefa).
alter table admins enable row level security;
alter table drivers enable row level security;
alter table representatives enable row level security;
alter table routes enable row level security;
alter table settings enable row level security;
alter table companies enable row level security;
alter table master_users enable row level security;

drop policy if exists "allow all anon" on admins;
drop policy if exists "allow all anon" on drivers;
drop policy if exists "allow all anon" on representatives;
drop policy if exists "allow all anon" on routes;
drop policy if exists "allow all anon" on settings;
drop policy if exists "allow all anon" on companies;
drop policy if exists "allow all anon" on master_users;

create policy "allow all anon" on admins for all using (true) with check (true);
create policy "allow all anon" on drivers for all using (true) with check (true);
create policy "allow all anon" on representatives for all using (true) with check (true);
create policy "allow all anon" on routes for all using (true) with check (true);
create policy "allow all anon" on settings for all using (true) with check (true);
create policy "allow all anon" on companies for all using (true) with check (true);
create policy "allow all anon" on master_users for all using (true) with check (true);

-- Habilita Realtime (equivalente ao onSnapshot do Firestore) nas tabelas usadas pelos listeners.
-- Idempotente: pula tabelas que já estão na publicação (evita o erro 42710 ao rodar de novo).
do $$
declare
  t text;
begin
  foreach t in array array['admins', 'drivers', 'representatives', 'routes', 'companies', 'master_users'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
