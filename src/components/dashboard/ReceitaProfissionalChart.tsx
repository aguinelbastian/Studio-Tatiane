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
      name: r.nome || 'Desconhecido',
      Planos: Number(r.receita_planos || 0),
      Pacotes: Number(r.receita_pacotes || 0),
      Comissão: Number(r.comissao_profissional || 0),
    }))
  }, [receitas])

  return (
    <Card className="h-full shadow-subtle">
      <CardHeader>
        <CardTitle>Receita por Profissional</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ChartContainer
          config={{
            Planos: { label: 'Planos', color: 'hsl(220, 70%, 50%)' },
            Pacotes: { label: 'Pacotes', color: 'hsl(160, 60%, 45%)' },
            Comissão: { label: 'Comissão', color: 'hsl(280, 65%, 60%)' },
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
              <Bar dataKey="Planos" stackId="a" fill="var(--color-Planos)" radius={[0, 0, 4, 4]} />
              <Bar
                dataKey="Pacotes"
                stackId="a"
                fill="var(--color-Pacotes)"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="Comissão" fill="var(--color-Comissão)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
