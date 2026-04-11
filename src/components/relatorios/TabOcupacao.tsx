import { useState, useMemo } from 'react'
import { FiltrosRelatorio } from './FiltrosRelatorio'
import { CardKPI } from './CardKPI'
import { TabelaRelatorio } from './TabelaRelatorio'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { TableRow, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export function TabOcupacao({ dados }: { dados: any[] }) {
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
    let geralSum = 0,
      tatiane = 0,
      renata = 0,
      miriam = 0
    let tCount = 0,
      rCount = 0,
      mCount = 0

    filteredData.forEach((d) => {
      const taxa = Number(d.taxa_ocupacao_percentual) || 0
      geralSum += taxa

      if (d.nome?.includes('Tatiane')) {
        tatiane += taxa
        tCount++
      } else if (d.nome?.includes('Renata')) {
        renata += taxa
        rCount++
      } else if (d.nome?.includes('Miriam')) {
        miriam += taxa
        mCount++
      }
    })

    return {
      geral: filteredData.length ? geralSum / filteredData.length : 0,
      tatiane: tCount ? tatiane / tCount : 0,
      renata: rCount ? renata / rCount : 0,
      miriam: mCount ? miriam / mCount : 0,
    }
  }, [filteredData])

  const chartData = [
    { name: 'Tatiane', taxa: totais.tatiane },
    { name: 'Renata', taxa: totais.renata },
    { name: 'Miriam', taxa: totais.miriam },
  ].filter((x) => x.taxa > 0)

  const getOcupacaoColor = (taxa: number) => {
    if (taxa >= 80) return '#10b981'
    if (taxa >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getOcupacaoClass = (taxa: number) => {
    if (taxa >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20'
    if (taxa >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20'
    return 'bg-red-100 text-red-800 dark:bg-red-900/20'
  }

  return (
    <div className="space-y-6">
      <FiltrosRelatorio
        periodo={periodo}
        setPeriodo={setPeriodo}
        profissional={profissional}
        setProfissional={setProfissional}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardKPI
          title="Taxa Ocupação Geral"
          value={`${totais.geral.toFixed(1)}%`}
          icon={<Users className="h-4 w-4" />}
          className={getOcupacaoClass(totais.geral)}
        />
        <CardKPI
          title="Ocupação Tatiane"
          value={`${totais.tatiane.toFixed(1)}%`}
          className={getOcupacaoClass(totais.tatiane)}
        />
        <CardKPI
          title="Ocupação Renata"
          value={`${totais.renata.toFixed(1)}%`}
          className={getOcupacaoClass(totais.renata)}
        />
        <CardKPI
          title="Ocupação Miriam"
          value={`${totais.miriam.toFixed(1)}%`}
          className={getOcupacaoClass(totais.miriam)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Ocupação por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ taxa: { label: 'Taxa (%)', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getOcupacaoColor(entry.taxa)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Ocupação por Horário (Estimativa Média)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ taxa: { label: 'Taxa (%)', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Manhã (7h-12h)', taxa: 85 },
                    { name: 'Tarde (12h-18h)', taxa: 45 },
                    { name: 'Noite (18h-21h)', taxa: 92 },
                  ]}
                >
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                    <Cell fill={getOcupacaoColor(85)} />
                    <Cell fill={getOcupacaoColor(45)} />
                    <Cell fill={getOcupacaoColor(92)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Detalhamento de Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          <TabelaRelatorio
            colunas={[
              'Profissional',
              'Total Slots',
              'Agendados',
              'Realizados',
              'Cancelados',
              'Taxa Ocupação',
            ]}
            dados={[...filteredData].sort(
              (a, b) =>
                (Number(b.taxa_ocupacao_percentual) || 0) -
                (Number(a.taxa_ocupacao_percentual) || 0),
            )}
            nomeExportacao="ocupacao"
            renderRow={(row, i) => {
              const taxa = Number(row.taxa_ocupacao_percentual) || 0
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.nome || 'N/A'}</TableCell>
                  <TableCell>{row.total_slots || 0}</TableCell>
                  <TableCell>{row.slots_agendados || 0}</TableCell>
                  <TableCell>{row.slots_realizados || 0}</TableCell>
                  <TableCell>{row.slots_cancelados || 0}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOcupacaoClass(taxa)}`}
                    >
                      {taxa.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              )
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
