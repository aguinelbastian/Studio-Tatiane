import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Activity, CalendarCheck } from 'lucide-react'
import type { DashboardData } from '@/hooks/useDashboardData'

export const KPICards = memo(function KPICards({ kpis }: { kpis: DashboardData['kpis'] }) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatPercent = (val: number) => `${val.toFixed(1)}%`

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-subtle hover:shadow-md transition-shadow bg-blue-50/30 dark:bg-blue-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.clientesAtivos}</div>
          <p className="text-xs text-muted-foreground">Atualmente no studio</p>
        </CardContent>
      </Card>

      <Card className="shadow-subtle hover:shadow-md transition-shadow bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.receitaMes)}</div>
          <p className="text-xs text-muted-foreground">Em contratos iniciados este mês</p>
        </CardContent>
      </Card>

      <Card className="shadow-subtle hover:shadow-md transition-shadow bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full">
            <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(kpis.taxaOcupacaoGeral)}</div>
          <p className="text-xs text-muted-foreground">Média de ocupação profissional</p>
        </CardContent>
      </Card>

      <Card className="shadow-subtle hover:shadow-md transition-shadow bg-purple-50/30 dark:bg-purple-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aulas Realizadas</CardTitle>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-full">
            <CalendarCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.aulasRealizadas}</div>
          <p className="text-xs text-muted-foreground">Status confirmado no mês</p>
        </CardContent>
      </Card>
    </div>
  )
})
