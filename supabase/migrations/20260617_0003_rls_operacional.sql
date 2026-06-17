-- P0 / Task 3 — Policies das tabelas operacionais (acesso compartilhado autenticado).
-- NÃO liga RLS aqui (isso é a Task 6 / migration 0006).
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
