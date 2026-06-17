# Fase 1 — Correção do relatório/dashboard financeiro

> Data: 2026-06-17 · Branch: `feat/p0-security-rls`
> Origem: análise em `docs/analise_projeto_17_06_2026.md` (bugs P0 de receita/comissão).

## Objetivo

Tornar os números de receita e comissão do **Dashboard** e dos **Relatórios → Receitas** corretos e reconciliáveis, eliminando:

1. O **join cartesiano** em `vw_receitas_profissional` (inflava receita ~2,7× e atribuía o mesmo contrato a vários profissionais).
2. A **comissão fictícia** (`receita × %`) desconectada do ledger real `repasses_profissionais`.
3. O **agrupamento por nome hardcoded** (`nome.includes('Tatiane'|'Renata'|'Miriam')`) no frontend.

E, aproveitando a recriação das views, fechar um **vazamento de segurança**: hoje a role `anon` tem `SELECT` na view e ela **não** usa `security_invoker`, expondo receita/comissões a qualquer um com a anon key (fura o RLS). Alinhado à branch P0.

## Modelo de dados decidido

- **Receita é do estúdio**, contada **uma vez**. Não se atribui receita a profissional.
- **Por profissional**: apenas nº de aulas e **comissão vinda de `repasses_profissionais`** (o ledger real).
- Mostrar **Vendido** (contratos) e **Recebido** (pagamentos) lado a lado.
- **Líquida = Recebida − Comissões** (base caixa). Aluguel fica para Fase 2.

## Escopo

**Dentro:** views SQL + componentes de relatório/dashboard que as consomem + hardening de segurança das views tocadas.
**Fora (adiado):** idempotência/transação do repasse (próximo round); geração de parcelas, devolução de sessão, aluguel (Fase 2); filtro de período funcional na aba Receitas (Fase 4 — neste round o seletor de período é **removido da aba Receitas** por ser cosmético/enganoso); hardening das outras duas views (`vw_ocupacao_profissional`, `vw_comportamento_alunos`) — ver "Follow-ups".

---

## A) Banco — migration versionada

Arquivo: `supabase/migrations/20260617_0010_fix_views_financeiro.sql`

### A.1 Reescrever `vw_receitas_profissional` (por profissional, sem receita)

Valores reais esperados após aplicar (sanity-check): Tatiane comissão_total=170 / Renata=5,54 / Miriam=0; todas pendentes.

```sql
DROP VIEW IF EXISTS public.vw_receitas_profissional;

CREATE VIEW public.vw_receitas_profissional
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.nome,
  p.tipo,
  p.comissao_percentual,
  count(a.id)                                              AS total_aulas,
  count(a.id) FILTER (WHERE a.status = 'realizado')        AS aulas_realizadas,
  count(a.id) FILTER (WHERE a.status = 'cancelado')        AS aulas_canceladas,
  COALESCE(rp.comissao_total, 0)                           AS comissao_total,
  COALESCE(rp.comissao_paga, 0)                            AS comissao_paga,
  COALESCE(rp.comissao_pendente, 0)                        AS comissao_pendente
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
```

`rp` é pré-agregado (1 linha por profissional), então o `LEFT JOIN agendamentos` não o multiplica — sem cartesiano.

### A.2 Nova `vw_receita_estudio` (nível estúdio, 1 linha)

Valores reais esperados: vendido_total=4620 (planos 2170 + pacotes 2450), recebido_total=3100, comissoes_total=175,54, liquida_recebida=2924,46.

```sql
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
     COALESCE(SUM(preco_pago), 0)                                 AS vendido_total,
     COALESCE(SUM(preco_pago) FILTER (WHERE tipo = 'plano'), 0)   AS vendido_planos,
     COALESCE(SUM(preco_pago) FILTER (WHERE tipo = 'pacote'), 0)  AS vendido_pacotes
   FROM public.contratos_cliente
   WHERE status <> 'cancelado') v
CROSS JOIN
  (SELECT COALESCE(SUM(valor), 0) AS recebido_total
   FROM public.pagamentos
   WHERE status = 'confirmado') r
CROSS JOIN
  (SELECT
     COALESCE(SUM(valor_repasse), 0)                                       AS comissoes_total,
     COALESCE(SUM(valor_repasse) FILTER (WHERE status_pagamento = 'pendente'), 0) AS comissoes_pendente
   FROM public.repasses_profissionais) c;
```

### A.3 Grants / segurança (ambas as views)

```sql
REVOKE ALL ON public.vw_receitas_profissional FROM anon;
REVOKE ALL ON public.vw_receita_estudio      FROM anon;
GRANT SELECT ON public.vw_receitas_profissional TO authenticated, service_role;
GRANT SELECT ON public.vw_receita_estudio      TO authenticated, service_role;
```

`security_invoker = true` faz a view respeitar o RLS das tabelas-base (admin vê tudo; profissional veria só o seu; anon, nada). RLS já está habilitado nas 5 tabelas-base com policies para `authenticated`.

---

## B) Frontend

### B.1 `src/lib/supabase/types.ts`
- Atualizar o `Row` de `vw_receitas_profissional` (remover `receita_planos`, `receita_pacotes`, `comissao_profissional`; adicionar `comissao_total`, `comissao_paga`, `comissao_pendente`).
- Adicionar a view `vw_receita_estudio` em `Views` (necessário para `supabase.from('vw_receita_estudio')` passar no typecheck).

### B.2 `src/components/dashboard/ReceitaProfissionalChart.tsx`
- Título → **"Comissões por Profissional"**.
- Barras passam a ser comissão **Paga** (`comissao_paga`) e **Pendente** (`comissao_pendente`), empilhadas. Remove `Planos`/`Pacotes`.

### B.3 `src/components/relatorios/TabReceitas.tsx`
- Remove o bloco `totais` com nomes hardcoded.
- KPIs (de `vw_receita_estudio`, buscada via novo hook — ver B.5): **Receita Vendida**, **Receita Recebida**, **Comissões**, **Líquida** (= Recebida − Comissões).
- Pizza "Por Tipo": `vendido_planos` vs `vendido_pacotes`.
- Barras por profissional: `comissao_total` (de `dados`).
- Tabela "Detalhamento por Profissional": colunas **Profissional · Total Aulas · Realizadas · Taxa · Comissão Total · Paga · Pendente**.
- Filtro de profissional: opções construídas dinamicamente a partir de `dados` (por `id`), via prop nova em `FiltrosRelatorio`. Filtro de período **removido** desta aba.

### B.4 `src/components/relatorios/FiltrosRelatorio.tsx`
- Nova prop opcional `opcoesProfissional?: { id: string; nome: string }[]`: quando fornecida, renderiza essas opções (value = `id`) em vez das fixas Tatiane/Renata/Miriam.
- Nova prop opcional `mostrarPeriodo?: boolean` (default `true`): a aba Receitas passa `false`. Ocupação/Comportamento ficam inalteradas.

### B.5 `src/hooks/useRelatoriosData.ts`
- Adicionar a busca de `vw_receita_estudio` (1 linha) ao `Promise.all`, expondo `receitaEstudio` (objeto único) no retorno do hook.
- `Relatorios.tsx` repassa `receitaEstudio` para `TabReceitas` por prop.

### B.6 `src/hooks/useDashboardData.ts` + card de KPI
- `receitaMes` (contratos do mês por `data_inicio`) é mantido, mas **rotulado como "Vendido no mês"** no card que o exibe.
- Adicionar `recebidoMes` = soma de `pagamentos.valor` com `status='confirmado'` e `data_pagamento` no mês, exibido como segundo número/card.
- O `ReceitaProfissionalChart` (B.2) consome os novos campos de comissão da view; nenhuma outra mudança de fonte de dados no dashboard.

---

## Verificação

1. **Build/typecheck**: `npm run typecheck` e `npm run build` passam.
2. **Aplicar migration** no banco remoto via `./supabase/run_remote.sh supabase/migrations/20260617_0010_fix_views_financeiro.sql`.
3. **Sanity-check SQL** (psql): `SELECT * FROM vw_receita_estudio` → vendido_total=4620, recebido_total=3100, comissoes_total≈175,54, liquida_recebida≈2924,46. `SELECT nome, comissao_total FROM vw_receitas_profissional` → Tatiane 170 / Renata 5,54 / Miriam 0.
4. **Segurança (anon)**: probe REST com a anon key em `vw_receitas_profissional` e `vw_receita_estudio` deve retornar **erro/`[]`** (não os dados) — técnica do memory `verify-rls-anon-probe`.
5. **Visual**: Dashboard e Relatórios renderizam sem erro; sem `NaN`/`R$ undefined`.

## Follow-ups (fora deste round)
- `vw_ocupacao_profissional` e `vw_comportamento_alunos` têm o **mesmo vazamento anon + falta de `security_invoker`** (a de comportamento expõe PII de alunos). Tratar na thread de P0/RLS com o mesmo padrão.
- Idempotência/transação do repasse (próximo round).
- Filtro de período funcional (Fase 4).
