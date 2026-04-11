import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FilaReposicoesPendentes({ reposicoes, onMarcar }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <CalendarClock className="w-5 h-5 text-primary" />
          Pendentes
        </h3>
        <Badge variant="secondary" className="px-2 py-1">
          {reposicoes.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {reposicoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed bg-muted/20">
            Nenhuma reposição pendente
          </p>
        ) : (
          reposicoes.map((rep: any) => {
            const expiraEmMs =
              new Date(rep.data_limite + 'T23:59:59').getTime() - new Date().getTime()
            const diasParaExpirar = Math.ceil(expiraEmMs / (1000 * 60 * 60 * 24))
            const isUrgente = diasParaExpirar <= 7 && diasParaExpirar >= 0
            const isExpirado = diasParaExpirar < 0

            return (
              <Card
                key={rep.id}
                className={cn(
                  'overflow-hidden transition-all hover:shadow-md',
                  isUrgente && 'border-yellow-300 bg-yellow-50/30',
                  isExpirado && 'opacity-50 grayscale',
                )}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="font-medium text-sm truncate pr-2" title={rep.clientes?.nome}>
                      {rep.clientes?.nome}
                    </div>
                    {isUrgente && <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 flex justify-between items-center bg-background/50 rounded px-1.5 py-1">
                    <span className="truncate max-w-[100px]">{rep.profissionais?.nome}</span>
                    <span className={cn(isUrgente && 'text-yellow-600 font-medium')}>
                      {isExpirado ? 'Expirada' : `Expira em ${diasParaExpirar} d`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={isUrgente ? 'default' : 'secondary'}
                    className={cn(
                      'w-full text-xs h-8',
                      isUrgente && 'bg-yellow-500 hover:bg-yellow-600 text-white',
                    )}
                    disabled={isExpirado}
                    onClick={() => onMarcar(rep)}
                  >
                    Agendar Reposição
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
