-- ==========================================================================
-- Importador de Cargas (import-cargas.html): tabela no Supabase.
-- Antes as cargas ficavam só no localStorage do navegador (chave
-- 'fibrasol_banco_cargas'); agora ficam aqui, uma linha por carga.
--
-- Rode no SQL Editor DEPOIS de auth-and-rls-migration.sql (usa current_profile()).
-- Idempotente: pode rodar de novo sem erro.
-- ==========================================================================

create table if not exists import_cargas (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id) on delete cascade,
  "numeroCarga" text not null,
  montada boolean not null default false,
  -- Carga inteira como veio do importador: clientes, pedidos, itens,
  -- cidades (na ordem da rota), totais. O front é quem define o formato.
  dados jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Uma carga por número dentro de cada empresa (é a chave do upsert do front).
-- "nulls not distinct" pra que o master (companyId nulo) também não duplique.
create unique index if not exists import_cargas_company_numero_uniq
  on import_cargas ("companyId", "numeroCarga") nulls not distinct;

create or replace function public._runelog_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" := now();
  return new;
end $$;

drop trigger if exists import_cargas_touch on import_cargas;
create trigger import_cargas_touch before update on import_cargas
  for each row execute function public._runelog_touch_updated_at();

-- --------------------------------------------------------------------------
-- RLS: só admin da mesma empresa (ou o master) lê e grava.
-- Motorista e representante não enxergam o importador.
-- --------------------------------------------------------------------------
alter table import_cargas enable row level security;

drop policy if exists "admin da empresa ou master" on import_cargas;
create policy "admin da empresa ou master" on import_cargas for all using (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) = 'admin'
    and (select "companyId" from public.current_profile()) = "companyId"
  )
) with check (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) = 'admin'
    and (select "companyId" from public.current_profile()) = "companyId"
  )
);

-- Habilita Realtime nessa tabela, mesmo padrão idempotente do schema.sql -
-- sem isso, o painel de Fretes (que lista as cargas nesse select) só vê uma
-- carga nova depois de recarregar a página, em vez de na hora.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'import_cargas'
  ) then
    execute 'alter publication supabase_realtime add table import_cargas';
  end if;
end $$;

notify pgrst, 'reload schema';
