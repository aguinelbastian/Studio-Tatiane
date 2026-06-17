-- P0 / Task 9 — Mantém aguinel@gmail.com como admin permanente do sistema
-- (segundo admin além da Tatiane). Idempotente.
--
-- PRÉ-REQUISITO: a conta de auth aguinel@gmail.com deve existir
-- (Painel → Authentication → Users). Ela já existia como login de teste e o
-- 0007 deixou de removê-la; se por algum motivo não existir, criar com
-- "Auto Confirm User" antes de rodar este script.
--
-- Identidade no RLS é por email (auth.jwt() ->> 'email'), então basta a linha
-- em public.usuarios com role=admin para os helpers app_is_admin()/app_role()
-- darem acesso total.

insert into public.usuarios (email, nome, role, status)
values ('aguinel@gmail.com', 'Aguinel J. Bastian Jr.', 'admin', 'ativo')
on conflict (email) do update
  set role = 'admin', status = 'ativo', nome = excluded.nome;
