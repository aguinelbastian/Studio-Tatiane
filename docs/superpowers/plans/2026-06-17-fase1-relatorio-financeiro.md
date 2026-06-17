# Fase 1 — Correção do relatório/dashboard financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar receita/comissão do Dashboard e Relatórios corretos e reconciliáveis, eliminando o join cartesiano e a comissão fictícia, e fechando o vazamento das views para o `anon`.

**Architecture:** Reescrever duas views Postgres (uma por-profissional baseada no ledger `repasses_profissionais`, outra de receita do estúdio) com `security_invoker=true`; depois ajustar os componentes React que as consomem para usar os novos campos e parar de agrupar por nome hardcoded.

**Tech Stack:** Postgres (Supabase) · React 19 + TypeScript · Vite · Recharts · supabase-js. **Sem framework de testes** (`npm test` é stub) — o ciclo de verificação de cada task é `npm run typecheck` + (na migration) sanity-check SQL via `./supabase/run_remote.sh` + probe anônimo REST.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-06-17-fase1-relatorio-financeiro-design.md`.
- Modelo: receita é do **estúdio** (contada uma vez); por profissional só **comissão** (de `repasses_profissionais`) + nº de aulas. Mostrar **Vendido** (contratos, exclui `cancelado`) e **Recebido** (`pagamentos.status='confirmado'`). **Líquida = Recebida − Comissões**.
- Banco remoto: aplicar SQL com `./supabase/run_remote.sh <arquivo.sql>` (lê credencial de `.dburl`, gitignored). Nunca ecoar a senha.
- Componentes consomem linhas de view como `any[]` — typecheck não pega campos faltantes, por isso o sanity-check SQL é a rede de segurança dos nomes de coluna.
- Mensagem de commit termina com: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Valores reais esperados (sanity-check pós-migration): Vendido=4620 (planos 2170 / pacotes 2450), Recebido=3100, Comissões=175,54 (Tatiane 170 / Renata 5,54 / Miriam 0), Líquida=2924,46.

---

### Task 1: Migration — reescrever views + hardening

**Files:**
- Create: `supabase/migrations/20260617_0010_fix_views_financeiro.sql`

**Interfaces:**
- Produces: view `vw_receitas_profissional` com colunas `id, nome, tipo, comissao_percentual, total_aulas, aulas_realizadas, aulas_canceladas, comissao_total, comissao_paga, comissao_pendente`.
- Produces: view `vw_receita_estudio` com colunas `vendido_total, vendido_planos, vendido_pacotes, recebido_total, comissoes_total, comissoes_pendente, liquida_recebida`.

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/20260617_0010_fix_views_financeiro.sql` com:

```sql
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
```

- [ ] **Step 2: Aplicar no banco remoto**

Run: `./supabase/run_remote.sh supabase/migrations/20260617_0010_fix_views_financeiro.sql`
Expected: sem erro (`CREATE VIEW`, `GRANT`, `REVOKE` ok), `ON_ERROR_STOP=1` não dispara.

- [ ] **Step 3: Sanity-check dos valores**

Run:
```bash
./supabase/run_remote.sh -c "SELECT * FROM vw_receita_estudio;"
./supabase/run_remote.sh -c "SELECT nome, total_aulas, aulas_realizadas, comissao_total, comissao_paga, comissao_pendente FROM vw_receitas_profissional ORDER BY nome;"
```
Expected: `vw_receita_estudio` → vendido_total=4620.00, vendido_planos=2170.00, vendido_pacotes=2450.00, recebido_total=3100.00, comissoes_total=175.54, comissoes_pendente=175.54, liquida_recebida=2924.46. Por profissional → Tatiane comissao_total=170 / Renata 5.54 / Miriam 0. **Nenhuma receita atribuída a profissional** (colunas de receita não existem mais).

- [ ] **Step 4: Probe anônimo (vazamento fechado)**

Run:
```bash
ANON=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code}\n" "https://hnyjvjflpoierndarupx.supabase.co/rest/v1/vw_receita_estudio?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -s "https://hnyjvjflpoierndarupx.supabase.co/rest/v1/vw_receitas_profissional?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```
Expected: código HTTP **não-2xx** (401/403/permission denied) e corpo de erro — **não** uma lista de dados financeiros. (Antes, o anon lia tudo.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260617_0010_fix_views_financeiro.sql
git commit -m "fix(db): reescreve views financeiras (sem cartesiano, comissao do ledger) e fecha anon

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Atualizar tipos gerados das views

**Files:**
- Modify: `src/lib/supabase/types.ts` (bloco `Views`, ~linhas 936-950)

**Interfaces:**
- Consumes: nomes de coluna definidos na Task 1.
- Produces: tipos `Database['public']['Views']['vw_receitas_profissional']` e `['vw_receita_estudio']` que destravam `supabase.from('vw_receita_estudio')` no typecheck.

- [ ] **Step 1: Substituir o Row de `vw_receitas_profissional` e adicionar `vw_receita_estudio`**

Localizar em `src/lib/supabase/types.ts` o bloco:

```ts
      vw_receitas_profissional: {
        Row: {
          aulas_canceladas: number | null
          aulas_realizadas: number | null
          comissao_percentual: number | null
          comissao_profissional: number | null
          id: string | null
          nome: string | null
          receita_pacotes: number | null
          receita_planos: number | null
          tipo: string | null
          total_aulas: number | null
        }
        Relationships: []
      }
```

e substituí-lo por:

```ts
      vw_receitas_profissional: {
        Row: {
          id: string | null
          nome: string | null
          tipo: string | null
          comissao_percentual: number | null
          total_aulas: number | null
          aulas_realizadas: number | null
          aulas_canceladas: number | null
          comissao_total: number | null
          comissao_paga: number | null
          comissao_pendente: number | null
        }
        Relationships: []
      }
      vw_receita_estudio: {
        Row: {
          vendido_total: number | null
          vendido_planos: number | null
          vendido_pacotes: number | null
          recebido_total: number | null
          comissoes_total: number | null
          comissoes_pendente: number | null
          liquida_recebida: number | null
        }
        Relationships: []
      }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (sem erros).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "types(db): atualiza views financeiras (comissao_*, vw_receita_estudio)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dashboard — KPI Vendido + Recebido no mês

**Files:**
- Modify: `src/hooks/useDashboardData.ts`
- Modify: `src/components/dashboard/KPICards.tsx`

**Interfaces:**
- Produces: `DashboardData['kpis']` ganha o campo `recebidoMes: number`.

- [ ] **Step 1: Adicionar `recebidoMes` ao tipo e à busca em `useDashboardData.ts`**

No `interface DashboardData`, dentro de `kpis`, adicionar a linha `recebidoMes` logo após `receitaMes`:

```ts
  kpis: {
    clientesAtivos: number
    receitaMes: number
    recebidoMes: number
    taxaOcupacaoGeral: number
    aulasRealizadas: number
  }
```

Depois do bloco `// 2. Receita do Mês` (que calcula `receitaMes`), inserir:

```ts
      // 2b. Recebido no Mês (caixa — pagamentos confirmados no mês)
      const { data: pagamentosMes } = await supabase
        .from('pagamentos')
        .select('valor')
        .eq('status', 'confirmado')
        .gte('data_pagamento', startStr)
        .lte('data_pagamento', endStr)
      const recebidoMes =
        pagamentosMes?.reduce((acc, curr) => acc + Number(curr.valor || 0), 0) || 0
```

No objeto `setData({ kpis: { ... } })`, adicionar `recebidoMes,` após `receitaMes,`:

```ts
        kpis: {
          clientesAtivos: clientesAtivos || 0,
          receitaMes,
          recebidoMes,
          taxaOcupacaoGeral,
          aulasRealizadas: aulasRealizadas || 0,
        },
```

- [ ] **Step 2: Relabel + Recebido no card em `KPICards.tsx`**

Substituir o `<Card>` da "Receita do Mês" (o bloco com `CardTitle` "Receita do Mês") por:

```tsx
      <Card className="shadow-subtle hover:shadow-md transition-shadow bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendido no Mês</CardTitle>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.receitaMes)}</div>
          <p className="text-xs text-muted-foreground">
            Recebido: {formatCurrency(kpis.recebidoMes)}
          </p>
        </CardContent>
      </Card>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDashboardData.ts src/components/dashboard/KPICards.tsx
git commit -m "feat(dashboard): KPI mostra Vendido e Recebido no mes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Dashboard — gráfico de comissões por profissional

**Files:**
- Modify: `src/components/dashboard/ReceitaProfissionalChart.tsx`

**Interfaces:**
- Consumes: campos `comissao_paga`, `comissao_pendente` de `vw_receitas_profissional` (Task 1) via prop `receitas`.

- [ ] **Step 1: Reescrever o componente para plotar comissão paga vs pendente**

Substituir o conteúdo de `src/components/dashboard/ReceitaProfissionalChart.tsx` por:

```tsx
import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export const ReceitaProfissionalChart = memo(function ReceitaProfissionalChart({
  receitas,
}: {
  receitas: any[]
}) {
  const chartData = useMemo(() => {
    return receitas.map((r) => ({
      name: (r.nome || 'Desconhecido').split(' ')[0],
      Paga: Number(r.comissao_paga || 0),
      Pendente: Number(r.comissao_pendente || 0),
    }))
  }, [receitas])

  return (
    <Card className="h-full shadow-subtle">
      <CardHeader>
        <CardTitle>Comissões por Profissional</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ChartContainer
          config={{
            Paga: { label: 'Paga', color: 'hsl(160, 60%, 45%)' },
            Pendente: { label: 'Pendente', color: 'hsl(40, 90%, 55%)' },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${v}`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Paga" stackId="a" fill="var(--color-Paga)" radius={[0, 0, 4, 4]} />
              <Bar
                dataKey="Pendente"
                stackId="a"
                fill="var(--color-Pendente)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ReceitaProfissionalChart.tsx
git commit -m "feat(dashboard): grafico vira Comissoes por Profissional (paga vs pendente)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: FiltrosRelatorio — opções dinâmicas + ocultar período

**Files:**
- Modify: `src/components/relatorios/FiltrosRelatorio.tsx`

**Interfaces:**
- Produces: props opcionais `opcoesProfissional?: { id: string; nome: string }[]` e `mostrarPeriodo?: boolean` (default `true`). Backward-compatible: chamadas existentes (Ocupação/Comportamento) não mudam.

- [ ] **Step 1: Estender a interface e o render**

Substituir o conteúdo de `src/components/relatorios/FiltrosRelatorio.tsx` por:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface FiltrosRelatorioProps {
  periodo: string
  setPeriodo: (val: string) => void
  profissional?: string
  setProfissional?: (val: string) => void
  busca?: string
  setBusca?: (val: string) => void
  opcoesProfissional?: { id: string; nome: string }[]
  mostrarPeriodo?: boolean
}

export function FiltrosRelatorio({
  periodo,
  setPeriodo,
  profissional,
  setProfissional,
  busca,
  setBusca,
  opcoesProfissional,
  mostrarPeriodo = true,
}: FiltrosRelatorioProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
      {mostrarPeriodo && (
        <div className="w-full sm:w-48">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Este Trimestre</SelectItem>
              <SelectItem value="semestre">Este Semestre</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
              <SelectItem value="todos">Todo o Período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {setProfissional && (
        <div className="w-full sm:w-48">
          <Select value={profissional || 'todos'} onValueChange={setProfissional}>
            <SelectTrigger>
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {opcoesProfissional
                ? opcoesProfissional.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))
                : (
                  <>
                    <SelectItem value="tatiane">Tatiane</SelectItem>
                    <SelectItem value="renata">Renata</SelectItem>
                    <SelectItem value="miriam">Miriam</SelectItem>
                  </>
                )}
            </SelectContent>
          </Select>
        </div>
      )}
      {setBusca !== undefined && (
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar cliente..."
            value={busca || ''}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/relatorios/FiltrosRelatorio.tsx
git commit -m "feat(relatorios): FiltrosRelatorio aceita opcoes dinamicas e ocultar periodo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: useRelatoriosData — buscar `vw_receita_estudio`

**Files:**
- Modify: `src/hooks/useRelatoriosData.ts`

**Interfaces:**
- Produces: o hook retorna `receitaEstudio: any` (objeto único, ou `null`).

- [ ] **Step 1: Adicionar estado, busca e retorno**

Em `src/hooks/useRelatoriosData.ts`:

Adicionar o estado após `const [comportamento, setComportamento] = useState<any[]>([])`:

```ts
  const [receitaEstudio, setReceitaEstudio] = useState<any>(null)
```

Trocar o `Promise.all` e o bloco de set por:

```ts
      const [resReceitas, resOcupacao, resComportamento, resEstudio] = await Promise.all([
        supabase.from('vw_receitas_profissional').select('*').limit(500),
        supabase.from('vw_ocupacao_profissional').select('*').limit(500),
        supabase.from('vw_comportamento_alunos').select('*').limit(1000),
        supabase.from('vw_receita_estudio').select('*').maybeSingle(),
      ])

      if (resReceitas.error) throw resReceitas.error
      if (resOcupacao.error) throw resOcupacao.error
      if (resComportamento.error) throw resComportamento.error
      if (resEstudio.error) throw resEstudio.error

      setReceitas(resReceitas.data || [])
      setOcupacao(resOcupacao.data || [])
      setComportamento(resComportamento.data || [])
      setReceitaEstudio(resEstudio.data || null)
```

Trocar o `return`:

```ts
  return { receitas, ocupacao, comportamento, receitaEstudio, loading, refetch: fetchData }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRelatoriosData.ts
git commit -m "feat(relatorios): busca vw_receita_estudio no hook de dados

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: TabReceitas + Relatorios — KPIs do estúdio, filtro por id, tabela de comissão

**Files:**
- Modify: `src/components/relatorios/TabReceitas.tsx`
- Modify: `src/pages/Relatorios.tsx`

**Interfaces:**
- Consumes: `receitaEstudio` (Task 6); props de `FiltrosRelatorio` (Task 5); colunas `comissao_*` de `vw_receitas_profissional` (Task 1).

- [ ] **Step 1: Passar `receitaEstudio` para `TabReceitas` em `Relatorios.tsx`**

Trocar a linha `const { receitas, ocupacao, comportamento, loading } = useRelatoriosData()` por:

```tsx
  const { receitas, ocupacao, comportamento, receitaEstudio, loading } = useRelatoriosData()
```

Trocar `<TabReceitas dados={receitas} />` por:

```tsx
          <TabReceitas dados={receitas} receitaEstudio={receitaEstudio} />
```

- [ ] **Step 2: Reescrever `TabReceitas.tsx`**

Substituir o conteúdo de `src/components/relatorios/TabReceitas.tsx` por:

```tsx
import { useState, useMemo } from 'react'
import { FiltrosRelatorio } from './FiltrosRelatorio'
import { CardKPI } from './CardKPI'
import { TabelaRelatorio } from './TabelaRelatorio'
import { DollarSign } from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { TableRow, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TabReceitas({ dados, receitaEstudio }: { dados: any[]; receitaEstudio: any }) {
  const [profissional, setProfissional] = useState('todos')

  const opcoesProfissional = useMemo(
    () => dados.map((d) => ({ id: String(d.id), nome: String(d.nome ?? 'N/A') })),
    [dados],
  )

  const filteredData = useMemo(() => {
    if (profissional === 'todos') return dados
    return dados.filter((d) => String(d.id) === profissional)
  }, [dados, profissional])

  const est = receitaEstudio ?? {}
  const vendido = Number(est.vendido_total) || 0
  const recebido = Number(est.recebido_total) || 0
  const comissoes = Number(est.comissoes_total) || 0
  const liquida = Number(est.liquida_recebida) || 0

  const chartData = filteredData
    .map((d) => ({ name: String(d.nome ?? 'N/A').split(' ')[0], valor: Number(d.comissao_total) || 0 }))
    .filter((x) => x.valor > 0)

  const pieData = [
    { name: 'Planos', value: Number(est.vendido_planos) || 0 },
    { name: 'Pacotes', value: Number(est.vendido_pacotes) || 0 },
  ].filter((x) => x.value > 0)

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`

  return (
    <div className="space-y-6">
      <FiltrosRelatorio
        periodo="todos"
        setPeriodo={() => {}}
        profissional={profissional}
        setProfissional={setProfissional}
        opcoesProfissional={opcoesProfissional}
        mostrarPeriodo={false}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardKPI
          title="Receita Vendida"
          value={formatCurrency(vendido)}
          icon={<DollarSign className="h-4 w-4" />}
          description="Contratos (exclui cancelados)"
          className="bg-primary/5"
        />
        <CardKPI
          title="Receita Recebida"
          value={formatCurrency(recebido)}
          icon={<DollarSign className="h-4 w-4" />}
          description="Pagamentos confirmados"
        />
        <CardKPI title="Comissões" value={formatCurrency(comissoes)} trend="down" />
        <CardKPI
          title="Líquida (Recebida)"
          value={formatCurrency(liquida)}
          icon={<DollarSign className="h-4 w-4" />}
          description="Recebida − Comissões"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Comissão por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ valor: { label: 'Comissão', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Vendido por Tipo de Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Valor', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Detalhamento por Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <TabelaRelatorio
            colunas={[
              'Profissional',
              'Total Aulas',
              'Realizadas',
              'Taxa Real.',
              'Comissão Total',
              'Paga',
              'Pendente',
            ]}
            dados={filteredData}
            nomeExportacao="receitas"
            renderRow={(row, i) => {
              const totalAulas = Number(row.total_aulas) || 0
              const realizadas = Number(row.aulas_realizadas) || 0
              const taxa =
                totalAulas > 0 ? ((realizadas / totalAulas) * 100).toFixed(1) + '%' : '0%'
              const comTotal = Number(row.comissao_total) || 0
              const comPaga = Number(row.comissao_paga) || 0
              const comPend = Number(row.comissao_pendente) || 0
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.nome || 'N/A'}</TableCell>
                  <TableCell>{totalAulas}</TableCell>
                  <TableCell>{realizadas}</TableCell>
                  <TableCell>{taxa}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(comTotal)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(comPaga)}</TableCell>
                  <TableCell className="text-amber-600">{formatCurrency(comPend)}</TableCell>
                </TableRow>
              )
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/relatorios/TabReceitas.tsx src/pages/Relatorios.tsx
git commit -m "feat(relatorios): receita do estudio (Vendido/Recebido/Liquida) e comissao por profissional sem nome hardcoded

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- A.1 view por-profissional → Task 1. A.2 `vw_receita_estudio` → Task 1. A.3 grants/segurança → Task 1.
- B.1 types.ts → Task 2. B.2 ReceitaProfissionalChart → Task 4. B.3 TabReceitas → Task 7. B.4 FiltrosRelatorio → Task 5. B.5 useRelatoriosData → Task 6. B.6 useDashboardData/KPICards → Task 3.
- Verificação (build/typecheck, migration, sanity SQL, probe anon) → Tasks 1 e 7.
- Out-of-scope (período removido da aba Receitas) → Task 7 passa `mostrarPeriodo={false}`. ✔ Sem lacunas.

**Placeholder scan:** nenhum TBD/TODO; todo passo de código mostra o código completo.

**Type consistency:** `recebidoMes` (Task 3) usado em KPICards (Task 3). `opcoesProfissional`/`mostrarPeriodo` (Task 5) usados em TabReceitas (Task 7). `receitaEstudio` retornado por useRelatoriosData (Task 6) e consumido em Relatorios→TabReceitas (Task 7). Colunas `comissao_paga`/`comissao_pendente`/`comissao_total` definidas na view (Task 1) e tipos (Task 2), usadas nas Tasks 4 e 7. Consistente.
