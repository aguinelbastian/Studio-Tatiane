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
