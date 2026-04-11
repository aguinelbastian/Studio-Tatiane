import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export const OcupacaoHorarioChart = memo(function OcupacaoHorarioChart({
  agendamentos,
}: {
  agendamentos: any[]
}) {
  const chartData = useMemo(() => {
    const counts = { Manhã: 0, Tarde: 0, Noite: 0 }

    agendamentos.forEach((a) => {
      const date = new Date(a.data_hora)
      // Ajuste simples para não usar UTC e confiar no Date parse local
      const hour = date.getHours()

      if (hour >= 7 && hour < 12) counts.Manhã++
      else if (hour >= 12 && hour < 18) counts.Tarde++
      else if (hour >= 18 && hour <= 23) counts.Noite++
    })

    return [
      { name: 'Manhã (07-12h)', count: counts.Manhã },
      { name: 'Tarde (12-18h)', count: counts.Tarde },
      { name: 'Noite (18-21h)', count: counts.Noite },
    ]
  }, [agendamentos])

  return (
    <Card className="h-full shadow-subtle">
      <CardHeader>
        <CardTitle>Agendamentos por Turno (Mês)</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ChartContainer
          config={{
            count: { label: 'Agendamentos', color: 'hsl(var(--primary))' },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
              layout="vertical"
            >
              <XAxis
                type="number"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
