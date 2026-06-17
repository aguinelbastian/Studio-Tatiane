-- =====================================================================
-- P0 — DIAGNÓSTICO DA RECURSÃO DE RLS (somente leitura, não altera nada)
-- Rodar no SQL Editor do painel e me mandar a saída das 3 consultas.
-- =====================================================================

-- (1) TODAS as policies em public — procurar duplicatas/antigas que referenciem usuarios
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- (2) Donas + flag security definer das funções helper
select p.proname,
       r.rolname            as owner,
       p.prosecdef          as security_definer,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_roles r on r.oid = p.proowner
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('app_role','app_is_admin','app_profissional_id');

-- (3) Dona da tabela usuarios + se tem FORCE RLS (force faz o dono NÃO pular o RLS)
select c.relname,
       r.rolname              as owner,
       c.relrowsecurity       as rls_on,
       c.relforcerowsecurity  as force_rls
from pg_class c
join pg_roles r on r.oid = c.relowner
where c.relnamespace = 'public'::regnamespace
  and c.relname = 'usuarios';
