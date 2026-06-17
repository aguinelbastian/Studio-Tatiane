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
