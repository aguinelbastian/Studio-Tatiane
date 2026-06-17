-- P0 / Task 1 — Bootstrap do admin real (Tatiane).
-- A conta de auth (studiopilatestatiane@gmail.com / studio@123) é criada no painel
-- (Authentication > Add user, com Auto Confirm). Este SQL garante o perfil admin.
insert into public.usuarios (email, nome, role, status)
values ('studiopilatestatiane@gmail.com', 'Tatiane Kafka Ghizoni', 'admin', 'ativo')
on conflict (email) do update
  set role = 'admin', status = 'ativo', nome = excluded.nome;
