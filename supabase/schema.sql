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

-- RLS: acesso aberto para o anon key, equivalente ao Firestore em modo teste.
-- Mantém a mesma postura de segurança atual do app (fora de escopo endurecer agora).
alter table admins enable row level security;
alter table drivers enable row level security;
alter table representatives enable row level security;
alter table routes enable row level security;
alter table settings enable row level security;

drop policy if exists "allow all anon" on admins;
drop policy if exists "allow all anon" on drivers;
drop policy if exists "allow all anon" on representatives;
drop policy if exists "allow all anon" on routes;
drop policy if exists "allow all anon" on settings;

create policy "allow all anon" on admins for all using (true) with check (true);
create policy "allow all anon" on drivers for all using (true) with check (true);
create policy "allow all anon" on representatives for all using (true) with check (true);
create policy "allow all anon" on routes for all using (true) with check (true);
create policy "allow all anon" on settings for all using (true) with check (true);

-- Habilita Realtime (equivalente ao onSnapshot do Firestore) nas tabelas usadas pelos listeners.
alter publication supabase_realtime add table admins, drivers, representatives, routes;
