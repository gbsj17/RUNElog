-- Roda UMA VEZ, depois de aplicar supabase/schema.sql, para transformar o RUNElog
-- em multi-tenant sem perder os dados já existentes da Fibrasol.
-- Seguro rodar de novo: usa upsert por nome e só faz o backfill se companyId estiver nulo.

insert into companies (name, plan, status, features)
select 'Fibrasol', 'basico', 'active', '{"fretes": true, "rotasProdutos": true}'::jsonb
where not exists (select 1 from companies where name = 'Fibrasol');

update admins set "companyId" = (select id from companies where name = 'Fibrasol')
where "companyId" is null;

update drivers set "companyId" = (select id from companies where name = 'Fibrasol')
where "companyId" is null;

update representatives set "companyId" = (select id from companies where name = 'Fibrasol')
where "companyId" is null;

update routes set "companyId" = (select id from companies where name = 'Fibrasol')
where "companyId" is null;

-- Cria seu usuário master de teste (troque o PIN depois pelo painel).
insert into master_users (name, pin)
select 'master', '9090'
where not exists (select 1 from master_users where name = 'master');
