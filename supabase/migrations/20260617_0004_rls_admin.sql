-- P0 / Task 4 — Policies admin-only para tabelas financeiras/administrativas.
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
