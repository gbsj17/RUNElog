-- ==========================================================================
-- Adiciona a política de DELETE em "companies", que auth-and-rls-migration.sql
-- nunca criou (só tinha select/insert/update para master). Sem isso, o botão
-- "Excluir" empresa no painel Master não dá erro nenhum, mas também não
-- exclui nada — o RLS barra silenciosamente.
--
-- Idempotente: seguro rodar de novo.
-- ==========================================================================

drop policy if exists "master deletes companies" on companies;
create policy "master deletes companies" on companies for delete using (
  (select role from public.current_profile()) = 'master'
);

notify pgrst, 'reload schema';
