import { memo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import type { DashboardData } from '@/hooks/useDashboardData'

export const UltimasTransacoes = memo(function UltimasTransacoes({
  transacoes,
}: {
  transacoes: DashboardData['transacoes']
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'realizado':
      case 'confirmado':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'pendente':
      case 'agendado':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'cancelado':
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card className="h-full shadow-subtle">
      <CardHeader className="pb-4">
        <CardTitle>Últimas Movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pagamentos">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="reposicoes">Reposições</TabsTrigger>
          </TabsList>

          <TabsContent value="pagamentos" className="space-y-4">
            {transacoes.pagamentos?.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">
                Nenhum pagamento recente encontrado.
              </p>
            )}
            {transacoes.pagamentos?.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-full">{getStatusIcon(p.status)}</div>
                  <div>
                    <p className="text-sm font-medium">
                      {p.contratos_cliente?.clientes?.nome || 'Cliente Oculto'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {p.metodo} • {format(new Date(p.data_pagamento), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-bold">{formatCurrency(p.valor)}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="agendamentos" className="space-y-4">
            {transacoes.agendamentos?.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">
                Nenhum agendamento recente encontrado.
              </p>
            )}
            {transacoes.agendamentos?.map((a: any) => (
              <div
                key={a.id}
                className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-full">{getStatusIcon(a.status)}</div>
                  <div>
                    <p className="text-sm font-medium">{a.clientes?.nome || 'Cliente Oculto'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.data_hora), "dd/MM 'às' HH:mm")} • Prof.{' '}
                      {a.profissionais?.nome}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={a.status === 'realizado' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reposicoes" className="space-y-4">
            {transacoes.reposicoes?.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">
                Nenhuma reposição pendente encontrada.
              </p>
            )}
            {transacoes.reposicoes?.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-full">{getStatusIcon(r.status)}</div>
                  <div>
                    <p className="text-sm font-medium">{r.clientes?.nome || 'Cliente Oculto'}</p>
                    <p className="text-xs text-muted-foreground">
                      Limite: {format(new Date(r.data_limite), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="capitalize text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
})
