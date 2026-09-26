-- ==========================================================================
-- RUNElog: corrige o isolamento de dados em "routes".
--
-- A policy "company scoped routes" (auth-and-rls-migration.sql) libera
-- select/insert/update/delete pra qualquer usuário autenticado da mesma
-- empresa, sem checar se a rota é dele. Hoje o filtro "só minhas rotas"
-- (motorista) e "só minhas cargas" (representante) é feito só no
-- JavaScript (allRoutes.filter(...)) — quem chama a API do Supabase direto
-- (ou só abre o DevTools) consegue ler/editar rotas de outros motoristas e
-- representantes da mesma empresa. Isso troca essa policy única por
-- policies por comando e por perfil, escopando de verdade no banco:
--   - master: tudo.
--   - admin/logistics: tudo dentro da própria empresa (cadastram e
--     roteirizam, então precisam do CRUD completo).
--   - driver: só enxerga/atualiza a própria rota (não pode criar/apagar).
--   - representative: só enxerga as rotas onde é o repId ou está listado
--     no array "representantes" (mesmo critério já usado no client);
--     sem permissão de escrita.
--
-- Rode isto no SQL Editor do Supabase DEPOIS de auth-and-rls-migration.sql e
-- de logistics-role-migration.sql (as policies abaixo já citam o role
-- 'logistics', que só existe em current_profile() depois desse último).
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

drop policy if exists "company scoped routes" on routes;

create policy "select routes" on routes for select using (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) in ('admin', 'logistics')
    and (select "companyId" from public.current_profile()) = "companyId"
  )
  or (
    (select role from public.current_profile()) = 'driver'
    and "driverId" = (select id from public.current_profile())
  )
  or (
    (select role from public.current_profile()) = 'representative'
    and (
      "repId" = (select id from public.current_profile())
      or exists (
        select 1 from jsonb_array_elements(coalesce(representantes, '[]'::jsonb)) elem
        where (elem->>'id')::uuid = (select id from public.current_profile())
      )
    )
  )
);

create policy "insert routes" on routes for insert with check (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) in ('admin', 'logistics')
    and (select "companyId" from public.current_profile()) = "companyId"
  )
);

create policy "update routes" on routes for update using (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) in ('admin', 'logistics')
    and (select "companyId" from public.current_profile()) = "companyId"
  )
  or (
    (select role from public.current_profile()) = 'driver'
    and "driverId" = (select id from public.current_profile())
  )
) with check (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) in ('admin', 'logistics')
    and (select "companyId" from public.current_profile()) = "companyId"
  )
  or (
    (select role from public.current_profile()) = 'driver'
    and "driverId" = (select id from public.current_profile())
  )
);

create policy "delete routes" on routes for delete using (
  (select role from public.current_profile()) = 'master'
  or (
    (select role from public.current_profile()) in ('admin', 'logistics')
    and (select "companyId" from public.current_profile()) = "companyId"
  )
);

notify pgrst, 'reload schema';
