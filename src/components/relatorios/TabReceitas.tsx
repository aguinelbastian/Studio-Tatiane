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

export function TabReceitas({ dados }: { dados: any[] }) {
  const [periodo, setPeriodo] = useState('mes')
  const [profissional, setProfissional] = useState('todos')

  const filteredData = useMemo(() => {
    let d = dados
    if (profissional !== 'todos') {
      d = d.filter((x) => x.nome?.toLowerCase().includes(profissional))
    }
    return d
  }, [dados, profissional])

  const totais = useMemo(() => {
    let tatiane = 0,
      renata = 0,
      miriam = 0,
      comissaoRenata = 0,
      planos = 0,
      pacotes = 0

    filteredData.forEach((d) => {
      const rec = (Number(d.receita_planos) || 0) + (Number(d.receita_pacotes) || 0)
      const comissao = Number(d.comissao_profissional) || 0
      planos += Number(d.receita_planos) || 0
      pacotes += Number(d.receita_pacotes) || 0

      if (d.nome?.includes('Tatiane')) tatiane += rec
      else if (d.nome?.includes('Renata')) {
        renata += rec
        comissaoRenata += comissao
      } else if (d.nome?.includes('Miriam')) miriam += rec
    })

    const total = tatiane + renata + miriam
    const liquida = total - comissaoRenata
    return { total, tatiane, renata, comissaoRenata, liquida, planos, pacotes, miriam }
  }, [filteredData])

  const chartData = [
    { name: 'Tatiane', valor: totais.tatiane },
    { name: 'Renata', valor: totais.renata },
    { name: 'Miriam', valor: totais.miriam },
  ].filter((x) => x.valor > 0)

  const pieData = [
    { name: 'Planos', value: totais.planos },
    { name: 'Pacotes', value: totais.pacotes },
  ].filter((x) => x.value > 0)

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`

  return (
    <div className="space-y-6">
      <FiltrosRelatorio
        periodo={periodo}
        setPeriodo={setPeriodo}
        profissional={profissional}
        setProfissional={setProfissional}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <CardKPI
          title="Receita Total"
          value={formatCurrency(totais.total)}
          icon={<DollarSign className="h-4 w-4" />}
          className="bg-primary/5"
        />
        <CardKPI title="Receita Tatiane" value={formatCurrency(totais.tatiane)} />
        <CardKPI title="Receita Renata (Bruta)" value={formatCurrency(totais.renata)} />
        <CardKPI
          title="Comissão Renata"
          value={formatCurrency(totais.comissaoRenata)}
          trend="down"
        />
        <CardKPI
          title="Receita Líquida"
          value={formatCurrency(totais.liquida)}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Receita por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ valor: { label: 'Receita', color: 'hsl(var(--primary))' } }}
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
            <CardTitle>Por Tipo de Contrato</CardTitle>
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
              'Rec. Planos',
              'Rec. Pacotes',
              'Total Bruto',
              'Comissão',
            ]}
            dados={filteredData}
            nomeExportacao="receitas"
            renderRow={(row, i) => {
              const totalAulas = Number(row.total_aulas) || 0
              const realizadas = Number(row.aulas_realizadas) || 0
              const taxa =
                totalAulas > 0 ? ((realizadas / totalAulas) * 100).toFixed(1) + '%' : '0%'
              const recPlanos = Number(row.receita_planos) || 0
              const recPacotes = Number(row.receita_pacotes) || 0
              const totalBruto = recPlanos + recPacotes
              const comissao = Number(row.comissao_profissional) || 0
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.nome || 'N/A'}</TableCell>
                  <TableCell>{totalAulas}</TableCell>
                  <TableCell>{realizadas}</TableCell>
                  <TableCell>{taxa}</TableCell>
                  <TableCell>{formatCurrency(recPlanos)}</TableCell>
                  <TableCell>{formatCurrency(recPacotes)}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(totalBruto)}</TableCell>
                  <TableCell className="text-red-500">{formatCurrency(comissao)}</TableCell>
                </TableRow>
              )
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
