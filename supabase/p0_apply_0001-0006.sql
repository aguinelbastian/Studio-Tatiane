-- =====================================================================
-- P0 SEGURANÇA / RLS — SCRIPT CONSOLIDADO (Tasks 1 a 6)
-- Projeto: hnyjvjflpoierndarupx
-- Como usar: colar TUDO no SQL Editor do painel Supabase e executar.
-- Idempotente (drop ... if exists / create or replace) — pode rodar de novo sem erro.
--
-- PRÉ-REQUISITO MANUAL (fazer ANTES de rodar este script):
--   Painel → Authentication → Users → Add user
--     Email: studiopilatestatiane@gmail.com
--     Senha: studio@123   (trocar no 1º acesso)
--     Marcar "Auto Confirm User".
--   Pular se a conta já existir.
--
-- NÃO inclui a Task 7 (remoção das contas de teste). Rodar
-- supabase/migrations/20260617_0007_remove_test_accounts.sql SOMENTE
-- depois que a verificação no fim deste script passar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- TASK 1 (0001) — Perfil admin real (Tatiane)
-- ---------------------------------------------------------------------
insert into public.usuarios (email, nome, role, status)
values ('studiopilatestatiane@gmail.com', 'Tatiane Kafka Ghizoni', 'admin', 'ativo')
on conflict (email) do update
  set role = 'admin', status = 'ativo', nome = excluded.nome;


-- ---------------------------------------------------------------------
-- TASK 2 (0002) — Helpers SECURITY DEFINER (identidade por email do JWT)
-- ---------------------------------------------------------------------
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.usuarios where email = auth.jwt() ->> 'email' limit 1
$$;

create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin','superuser'), false)
$$;

create or replace function public.app_profissional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.id
  from public.profissionais p
  join public.usuarios u on p.usuario_id = u.id
  where u.email = auth.jwt() ->> 'email'
  limit 1
$$;

grant execute on function public.app_role() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_profissional_id() to authenticated;


-- ---------------------------------------------------------------------
-- TASK 3 (0003) — Policies das tabelas operacionais (staff autenticado)
-- (NÃO liga RLS aqui; isso é a Task 6.)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes']
  loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format(
      'create policy %I_rw on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
      t, t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- TASK 4 (0004) — Policies admin-only (financeiro/administrativo)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format(
      'create policy %I_admin on public.%I for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin())',
      t, t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- TASK 5 (0005) — Repasses (own-row), usuarios (self-read), profissionais
-- ---------------------------------------------------------------------
-- repasses_profissionais: admin vê tudo; profissional vê só os próprios. Escrita só admin.
drop policy if exists repasses_select on public.repasses_profissionais;
create policy repasses_select on public.repasses_profissionais for select to authenticated
  using (public.app_is_admin() or profissional_id = public.app_profissional_id());

drop policy if exists repasses_write on public.repasses_profissionais;
create policy repasses_write on public.repasses_profissionais for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());

-- usuarios: cada um lê a própria linha; admin lê todas. Escrita só admin.
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select to authenticated
  using (email = auth.jwt() ->> 'email' or public.app_is_admin());

drop policy if exists usuarios_write on public.usuarios;
create policy usuarios_write on public.usuarios for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());

-- profissionais: leitura para todo staff (nomes/cores na agenda); escrita só admin.
drop policy if exists profissionais_select on public.profissionais;
create policy profissionais_select on public.profissionais for select to authenticated
  using (auth.uid() is not null);

drop policy if exists profissionais_write on public.profissionais;
create policy profissionais_write on public.profissionais for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());


-- ---------------------------------------------------------------------
-- TASK 6 (0006) — LIGA O RLS em todas as tabelas de dados
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
    'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
    'repasses_profissionais','usuarios','profissionais']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;


-- =====================================================================
-- VERIFICAÇÃO — rodar e conferir que relrowsecurity = true em TODAS
-- =====================================================================
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
                  'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
                  'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
                  'repasses_profissionais','usuarios','profissionais')
order by relname;
