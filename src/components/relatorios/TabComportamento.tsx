import { useState, useMemo } from 'react'
import { FiltrosRelatorio } from './FiltrosRelatorio'
import { CardKPI } from './CardKPI'
import { TabelaRelatorio } from './TabelaRelatorio'
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
import { Activity, AlertCircle } from 'lucide-react'

export function TabComportamento({ dados }: { dados: any[] }) {
  const [periodo, setPeriodo] = useState('mes')
  const [busca, setBusca] = useState('')

  const filteredData = useMemo(() => {
    let d = dados
    if (busca) d = d.filter((x) => x.nome?.toLowerCase().includes(busca.toLowerCase()))
    return d
  }, [dados, busca])

  const totais = useMemo(() => {
    let ativos = 0,
      faltas = 0,
      reposicoes = 0,
      pagamentos = 0,
      freqSum = 0,
      freqCount = 0
    let planos = 0,
      pacotes = 0,
      pix = 0,
      transferencia = 0

    filteredData.forEach((d) => {
      if (d.status === 'ativo') ativos++
      faltas += Number(d.faltas) || 0
      reposicoes += Number(d.remarcacoes_pendentes) || 0
      pagamentos += Number(d.pagamentos_pendentes) || 0

      const totalAulas = Number(d.total_aulas_agendadas) || 0
      const realizadas = Number(d.aulas_realizadas) || 0
      if (totalAulas > 0) {
        freqSum += (realizadas / totalAulas) * 100
        freqCount++
      }

      if (d.formatos_contratacao?.includes('plano')) planos++
      if (d.formatos_contratacao?.includes('pacote')) pacotes++
      if (d.metodos_pagamento?.includes('pix')) pix++
      if (d.metodos_pagamento?.includes('transferencia')) transferencia++
    })

    return {
      ativos,
      faltas,
      reposicoes,
      pagamentos,
      frequenciaMedia: freqCount ? freqSum / freqCount : 0,
      planos,
      pacotes,
      pix,
      transferencia,
    }
  }, [filteredData])

  const chartDataFrequencia = useMemo(
    () =>
      filteredData
        .map((d) => {
          const totalAulas = Number(d.total_aulas_agendadas) || 0
          const realizadas = Number(d.aulas_realizadas) || 0
          return {
            name: d.nome?.split(' ')[0] || 'N/A',
            taxa: totalAulas > 0 ? (realizadas / totalAulas) * 100 : 0,
          }
        })
        .sort((a, b) => b.taxa - a.taxa)
        .slice(0, 10),
    [filteredData],
  )

  const getColor = (taxa: number) => (taxa >= 80 ? '#10b981' : taxa >= 50 ? '#f59e0b' : '#ef4444')
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b']

  const pieContratos = [
    { name: 'Planos', value: totais.planos },
    { name: 'Pacotes', value: totais.pacotes },
  ].filter((x) => x.value > 0)
  const piePagamentos = [
    { name: 'PIX', value: totais.pix },
    { name: 'Transf.', value: totais.transferencia },
  ].filter((x) => x.value > 0)

  return (
    <div className="space-y-6">
      <FiltrosRelatorio
        periodo={periodo}
        setPeriodo={setPeriodo}
        busca={busca}
        setBusca={setBusca}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <CardKPI
          title="Clientes Ativos"
          value={totais.ativos}
          icon={<Activity className="h-4 w-4" />}
        />
        <CardKPI title="Frequência Média" value={`${totais.frequenciaMedia.toFixed(1)}%`} />
        <CardKPI
          title="Total de Faltas"
          value={totais.faltas}
          trend={totais.faltas > 10 ? 'down' : 'neutral'}
        />
        <CardKPI
          title="Reposições Pend."
          value={totais.reposicoes}
          icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
        />
        <CardKPI
          title="Pagamentos Pend."
          value={totais.pagamentos}
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1 md:col-span-2 break-inside-avoid">
          <CardHeader>
            <CardTitle>Top 10 Frequência de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ taxa: { label: 'Freq (%)', color: 'hsl(var(--primary))' } }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataFrequencia}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                    {chartDataFrequencia.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.taxa)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="space-y-4 flex flex-col">
          <Card className="flex-1 break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição de Contratos</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer
                config={{ value: { label: 'Qtd', color: 'hsl(var(--primary))' } }}
                className="h-[120px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieContratos}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieContratos.map((e, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="flex-1 break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Métodos de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer
                config={{ value: { label: 'Qtd', color: 'hsl(var(--primary))' } }}
                className="h-[120px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={piePagamentos}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {piePagamentos.map((e, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Detalhamento por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <TabelaRelatorio
            colunas={[
              'Cliente',
              'Status',
              'Agendadas',
              'Realizadas',
              'Faltas',
              'Freq(%)',
              'Repos. Pend.',
              'Pgts Pend.',
            ]}
            dados={[...filteredData].sort((a, b) => {
              const ta = Number(a.total_aulas_agendadas) || 0,
                tb = Number(b.total_aulas_agendadas) || 0
              const fa = ta > 0 ? (Number(a.aulas_realizadas) || 0) / ta : 0
              const fb = tb > 0 ? (Number(b.aulas_realizadas) || 0) / tb : 0
              return fb - fa
            })}
            nomeExportacao="comportamento_clientes"
            renderRow={(row, i) => {
              const totalAulas = Number(row.total_aulas_agendadas) || 0
              const taxa =
                totalAulas > 0 ? ((Number(row.aulas_realizadas) || 0) / totalAulas) * 100 : 0
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.nome || 'N/A'}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{totalAulas}</TableCell>
                  <TableCell>{row.aulas_realizadas || 0}</TableCell>
                  <TableCell>{row.faltas || 0}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${taxa >= 80 ? 'bg-green-100 text-green-800' : taxa >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {taxa.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell
                    className={
                      Number(row.remarcacoes_pendentes) > 0 ? 'text-yellow-600 font-bold' : ''
                    }
                  >
                    {row.remarcacoes_pendentes || 0}
                  </TableCell>
                  <TableCell
                    className={Number(row.pagamentos_pendentes) > 0 ? 'text-red-600 font-bold' : ''}
                  >
                    {row.pagamentos_pendentes || 0}
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
