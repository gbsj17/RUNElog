-- ==========================================================================
-- Gestão de Fretes Terceirizados (log-fretes.js): tabela "cargas prontas".
--
-- Quando uma cotação de frete é fechada e a carga é dada como montada
-- (botão "Salvar Cotação"), o registro sai da lista de cotações pendentes
-- e vira uma linha aqui - o destino final citado no pedido do usuário como
-- "cargas prontas". Mesmo padrão de import_cargas: 1 linha por carga,
-- "dados" carrega o snapshot inteiro da cotação (motorista, veículo, valores
-- negociados, ordem de carregamento, agendamento, produtos agrupados etc.).
--
-- Rode no SQL Editor DEPOIS de auth-and-rls-migration.sql (usa current_profile()).
-- Idempotente: pode rodar de novo sem erro.
-- ==========================================================================

create table if not exists cargas_prontas (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id) on delete cascade,
  "numeroCarga" text not null,
  "numeroCarregamento" text,
  dados jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists cargas_prontas_company_numero_uniq
  on cargas_prontas ("companyId", "numeroCarga") nulls not distinct;

drop trigger if exists cargas_prontas_touch on cargas_prontas;
create trigger cargas_prontas_touch before update on cargas_prontas
  for each row execute function public._runelog_touch_updated_at();

-- --------------------------------------------------------------------------
-- RLS: só admin da mesma empresa (ou o master) lê e grava.
-- --------------------------------------------------------------------------
alter table cargas_prontas enable row level security;

drop policy if exists "admin da empresa ou master" on cargas_prontas;
create policy "admin da empresa ou master" on cargas_prontas for all using (
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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'cargas_prontas'
  ) then
    execute 'alter publication supabase_realtime add table cargas_prontas';
  end if;
end $$;

notify pgrst, 'reload schema';
