-- =====================================================================
-- P0 / Task 8 — Remove policies LEGADAS que causavam recursão de RLS.
--
-- Causa raiz: policies antigas (admin_*, prof_*, professor_*) sobreviveram às
-- migrations 0003-0005 (que só dropavam os nomes NOVOS). As legadas fazem
-- subquery direto em public.usuarios no contexto do chamador; como a própria
-- usuarios tinha policies legadas auto-referentes (admin_select_usuarios etc.),
-- qualquer acesso disparava "42P17 infinite recursion detected in policy for
-- relation usuarios". As funções helper (security definer, dona postgres) já
-- pulam o RLS corretamente — então o modelo P0 fica correto após remover só as
-- policies legadas.
--
-- Mantém INTACTAS as policies do P0: *_rw, *_admin, repasses_*, usuarios_*,
-- profissionais_select/profissionais_write. Os padrões abaixo (underscore
-- literal via escape) não casam com nenhuma delas.
-- Idempotente: drop ... if exists.
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
        'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
        'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
        'repasses_profissionais','usuarios','profissionais')
      and (policyname like 'admin\_%'     escape '\'
        or policyname like 'prof\_%'      escape '\'
        or policyname like 'professor\_%' escape '\')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- =====================================================================
-- VERIFICAÇÃO — deve sobrar exatamente uma/duas policy(s) limpa(s) por tabela.
-- Esperado:
--   clientes/agendamentos/contratos_cliente/consumo_pacote/reposicoes -> *_rw
--   pagamentos/pagamentos_aluguel/parcelas_planos/planos/pacotes/
--   horarios_funcionamento/periodos_fechamento/studio_config/audit_log -> *_admin
--   repasses_profissionais -> repasses_select + repasses_write
--   usuarios -> usuarios_select + usuarios_write
--   profissionais -> profissionais_select + profissionais_write
-- =====================================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
    'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
    'repasses_profissionais','usuarios','profissionais')
order by tablename, policyname;
