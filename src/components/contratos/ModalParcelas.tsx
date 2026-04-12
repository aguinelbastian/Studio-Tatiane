import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

export function ModalParcelas({ open, onOpenChange, contrato }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])

  useEffect(() => {
    if (open && contrato) {
      supabase
        .from('parcelas_planos')
        .select('*')
        .eq('contrato_id', contrato.id)
        .order('numero_parcela')
        .then(({ data }) => setParcelas(data || []))
    }
  }, [open, contrato])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Parcelas do Contrato</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcela</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.numero_parcela}ª</TableCell>
                <TableCell>R$ {p.valor_parcela?.toFixed(2)}</TableCell>
                <TableCell>{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.status === 'pago' ? 'default' : 'secondary'}
                    className={p.status === 'pago' ? 'bg-green-600' : ''}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {parcelas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma parcela encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}
