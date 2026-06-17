-- P0 / Task 6 — Liga o RLS em todas as tabelas de dados.
-- Aplicar SOMENTE após as policies (0003-0005) e o admin real (0001) existirem.
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
