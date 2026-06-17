-- Fase 1: corrige views financeiras (remove join cartesiano, reconcilia comissao
-- com repasses_profissionais) e fecha vazamento p/ anon (security_invoker + revoke).

DROP VIEW IF EXISTS public.vw_receitas_profissional;

CREATE VIEW public.vw_receitas_profissional
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.nome,
  p.tipo,
  p.comissao_percentual,
  count(a.id)                                       AS total_aulas,
  count(a.id) FILTER (WHERE a.status = 'realizado') AS aulas_realizadas,
  count(a.id) FILTER (WHERE a.status = 'cancelado') AS aulas_canceladas,
  COALESCE(rp.comissao_total, 0)                    AS comissao_total,
  COALESCE(rp.comissao_paga, 0)                     AS comissao_paga,
  COALESCE(rp.comissao_pendente, 0)                 AS comissao_pendente
FROM public.profissionais p
LEFT JOIN public.agendamentos a
  ON a.profissional_id = p.id
LEFT JOIN (
  SELECT
    profissional_id,
    SUM(valor_repasse)                                              AS comissao_total,
    SUM(valor_repasse) FILTER (WHERE status_pagamento = 'pago')     AS comissao_paga,
    SUM(valor_repasse) FILTER (WHERE status_pagamento = 'pendente') AS comissao_pendente
  FROM public.repasses_profissionais
  GROUP BY profissional_id
) rp ON rp.profissional_id = p.id
GROUP BY p.id, p.nome, p.tipo, p.comissao_percentual,
         rp.comissao_total, rp.comissao_paga, rp.comissao_pendente;

CREATE OR REPLACE VIEW public.vw_receita_estudio
WITH (security_invoker = true) AS
SELECT
  v.vendido_total,
  v.vendido_planos,
  v.vendido_pacotes,
  r.recebido_total,
  c.comissoes_total,
  c.comissoes_pendente,
  (r.recebido_total - c.comissoes_total) AS liquida_recebida
FROM
  (SELECT
     COALESCE(SUM(preco_pago), 0)                                AS vendido_total,
     COALESCE(SUM(preco_pago) FILTER (WHERE tipo = 'plano'), 0)  AS vendido_planos,
     COALESCE(SUM(preco_pago) FILTER (WHERE tipo = 'pacote'), 0) AS vendido_pacotes
   FROM public.contratos_cliente
   WHERE status <> 'cancelado') v
CROSS JOIN
  (SELECT COALESCE(SUM(valor), 0) AS recebido_total
   FROM public.pagamentos
   WHERE status = 'confirmado') r
CROSS JOIN
  (SELECT
     COALESCE(SUM(valor_repasse), 0)                                              AS comissoes_total,
     COALESCE(SUM(valor_repasse) FILTER (WHERE status_pagamento = 'pendente'), 0) AS comissoes_pendente
   FROM public.repasses_profissionais) c;

REVOKE ALL ON public.vw_receitas_profissional FROM anon;
REVOKE ALL ON public.vw_receita_estudio       FROM anon;
GRANT SELECT ON public.vw_receitas_profissional TO authenticated, service_role;
GRANT SELECT ON public.vw_receita_estudio       TO authenticated, service_role;
