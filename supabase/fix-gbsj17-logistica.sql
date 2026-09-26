-- ==========================================================================
-- Corrige o usuário "gbsj17": hoje ele está na tabela admins (sobrou de
-- antes de existir o perfil "logistics" — veja backfill-fibrasol.sql), mas
-- deveria ser Logística. Move a linha inteira de admins -> logistics_users
-- preservando authUserId/email, então o login (mesmo usuário/senha) continua
-- funcionando normalmente, só que agora como Logística.
--
-- Depois de rodar isto, use "Criar Admin" no painel Master (aba Empresas)
-- para cadastrar o Admin de verdade da empresa.
--
-- Rode isto no SQL Editor DEPOIS de cadastro-completo-migration.sql.
-- Idempotente: seguro rodar de novo (não faz nada se gbsj17 não estiver
-- mais em admins).
-- ==========================================================================

insert into logistics_users (id, name, "fullName", code, pin, cpf, phone, "companyId", "authUserId", email, "createdAt")
select id, name, "fullName", null, pin, null, null, "companyId", "authUserId", email, "createdAt"
from admins
where lower(name) = 'gbsj17'
on conflict (id) do nothing;

delete from admins where lower(name) = 'gbsj17';
