-- P0 / Task 7 — Remove as contas de teste. Aplicar SOMENTE após a verificação da Task 6 passar.
-- As linhas de public.profissionais (instrutoras reais) NÃO são apagadas; só as contas de login de teste.

-- Religa a profissional Tatiane à conta real (caso a de teste estivesse vinculada).
update public.profissionais
set usuario_id = (select id from public.usuarios where email = 'studiopilatestatiane@gmail.com')
where usuario_id in (select id from public.usuarios where email = 'tatiane@studio.com');

-- Desvincula profissionais ainda sem conta real (evita violar a FK ao deletar os usuarios de teste).
update public.profissionais
set usuario_id = null
where usuario_id in (
  select id from public.usuarios
  where email in ('renata@studio.com','miriam@studio.com','aguinel@studio.com','aguinel@gmail.com','admin@studio.com')
);

-- Remove perfis de teste em public.usuarios.
delete from public.usuarios
where email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');

-- Remove contas de auth de teste.
delete from auth.users
where email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');
