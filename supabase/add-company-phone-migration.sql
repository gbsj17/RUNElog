-- ==========================================================================
-- A coluna "phone" de companies só existia dentro de schema.sql (o script
-- base, rodado uma única vez lá no começo do projeto) — nunca foi migrada
-- separadamente. Quem só rodou os migrations incrementais nunca recebeu
-- essa coluna, e por isso Cadastrar/Editar Empresa quebra ao salvar telefone
-- com "Could not find the 'phone' column of 'companies' in the schema cache".
--
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

alter table companies add column if not exists phone text;

notify pgrst, 'reload schema';
