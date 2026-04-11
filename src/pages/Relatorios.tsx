import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const dataFaturamento = [
  { mes: 'Jan', valor: 12500 },
  { mes: 'Fev', valor: 14200 },
  { mes: 'Mar', valor: 13800 },
  { mes: 'Abr', valor: 16500 },
  { mes: 'Mai', valor: 15900 },
  { mes: 'Jun', valor: 18000 },
]

export default function Relatorios() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h2>
        <p className="text-muted-foreground">
          Visão analítica do faturamento e comissões (Acesso restrito ao Admin).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Estimado (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">R$ 18.000,00</div>
            <p className="text-xs text-muted-foreground mt-1">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissões a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ 4.250,00</div>
            <p className="text-xs text-muted-foreground mt-1">Referente a fechamento do dia 05</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência Estimada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">2.4%</div>
            <p className="text-xs text-muted-foreground mt-1">Abaixo da média histórica (3%)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução de Faturamento Anual</CardTitle>
          <CardDescription>Faturamento bruto consolidado mês a mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              valor: {
                label: 'Faturamento Bruto (R$)',
                color: 'hsl(var(--primary))',
              },
            }}
            className="h-[400px] w-full mt-4"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataFaturamento} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="mes"
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
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
