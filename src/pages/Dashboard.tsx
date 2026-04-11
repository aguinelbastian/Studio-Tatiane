import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, TrendingUp, Activity } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const data = [
  { name: 'Seg', agendamentos: 12 },
  { name: 'Ter', agendamentos: 18 },
  { name: 'Qua', agendamentos: 15 },
  { name: 'Qui', agendamentos: 22 },
  { name: 'Sex', agendamentos: 20 },
  { name: 'Sáb', agendamentos: 8 },
]

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Olá, {user?.name.split(' ')[0]}</h2>
        <p className="text-muted-foreground">Aqui está o resumo das atividades do estúdio hoje.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">+2 em relação a ontem</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">+4 novos este mês</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Presença</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Média da semana</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos a Vencer</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Nos próximos 15 dias</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-subtle">
          <CardHeader>
            <CardTitle>Fluxo da Semana</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                agendamentos: {
                  label: 'Agendamentos',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="agendamentos"
                    fill="var(--color-agendamentos)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-subtle">
          <CardHeader>
            <CardTitle>Próximas Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { time: '08:00', client: 'Maria Silva', type: 'Pilates Solo', prof: 'Tatiane' },
                { time: '09:00', client: 'João Pedro', type: 'Equipamento', prof: 'Carlos' },
                { time: '10:30', client: 'Ana Beatriz', type: 'Massoterapia', prof: 'Tatiane' },
                { time: '14:00', client: 'Roberto Dias', type: 'Pilates Solo', prof: 'Carlos' },
              ].map((session, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-14 text-sm font-medium text-muted-foreground">
                    {session.time}
                  </div>
                  <div className="flex-1 ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{session.client}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.type} com {session.prof}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
