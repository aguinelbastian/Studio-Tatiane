import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { usePagamentosMutacoes } from '@/hooks/usePagamentosMutacoes'

export function TabRepasses({ repasses, refetch }: any) {
  const { marcarRepassePago } = usePagamentosMutacoes(refetch)

  const handlePagar = async (id: string) => {
    if (confirm('Marcar repasse como pago?')) {
      await marcarRepassePago(id)
    }
  }

  return (
    <div className="space-y-4 mt-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Repasses Automáticos</h3>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Data da Aula</TableHead>
              <TableHead>Valor Bruto</TableHead>
              <TableHead>Comissão (%)</TableHead>
              <TableHead>Valor a Receber</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repasses.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.profissionais?.nome}</TableCell>
                <TableCell>{new Date(r.data_aula).toLocaleString('pt-BR')}</TableCell>
                <TableCell>R$ {r.valor_bruto.toFixed(2)}</TableCell>
                <TableCell>{r.percentual}%</TableCell>
                <TableCell className="font-bold text-green-600">
                  R$ {r.valor_repasse.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={r.status_pagamento === 'pago' ? 'default' : 'secondary'}
                    className={r.status_pagamento === 'pago' ? 'bg-green-600' : ''}
                  >
                    {r.status_pagamento}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status_pagamento === 'pendente' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePagar(r.id)}
                      title="Marcar como Pago"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {repasses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Nenhum repasse registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
