import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CalendarClock, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import type { DashboardData } from '@/hooks/useDashboardData'

export const AlertasOperacionais = memo(function AlertasOperacionais({
  alertas,
}: {
  alertas: DashboardData['alertas']
}) {
  return (
    <Card className="h-full shadow-subtle border-amber-200 dark:border-amber-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Alertas Operacionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full flex-shrink-0">
              <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Reposições Pendentes</p>
              <p className="text-xs text-muted-foreground">Necessitam de agendamento</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {alertas.reposicoesPendentes}
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-xs bg-white dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              <Link to="/agendamentos">Resolver</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full flex-shrink-0">
              <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Pagamentos Vencidos</p>
              <p className="text-xs text-muted-foreground">Atrasados no sistema</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-xl font-bold text-red-600 dark:text-red-400">
              {alertas.pagamentosVencidos}
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-xs bg-white dark:bg-red-950 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
            >
              <Link to="/contratos">Cobrar</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Contratos a Vencer</p>
              <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {alertas.contratosAVencer}
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-xs bg-white dark:bg-blue-950 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <Link to="/contratos">Renovar</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
