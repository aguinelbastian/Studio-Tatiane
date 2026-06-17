import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function ModalParcelas({ open, onOpenChange, contrato }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])
  const [metodos, setMetodos] = useState<Record<string, string>>({})

  const fetchParcelas = useCallback(async () => {
    if (!contrato) return
    const { data } = await supabase
      .from('parcelas_planos')
      .select('*')
      .eq('contrato_id', contrato.id)
      .order('numero_parcela')
    setParcelas(data || [])
  }, [contrato])

  useEffect(() => {
    if (open && contrato) fetchParcelas()
  }, [open, contrato, fetchParcelas])

  const marcarPaga = async (parcelaId: string) => {
    const p_metodo = metodos[parcelaId] || 'pix'
    const { error } = await supabase.rpc('marcar_parcela_paga', {
      p_parcela_id: parcelaId,
      p_metodo,
    })
    if (error) {
      toast.error('Erro ao marcar parcela: ' + error.message)
      return
    }
    toast.success('Parcela marcada como paga')
    fetchParcelas()
  }

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
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell className="text-right">
                  {p.status !== 'pago' && (
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={metodos[p.id] || 'pix'}
                        onValueChange={(v) => setMetodos((m) => ({ ...m, [p.id]: v }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => marcarPaga(p.id)}>
                        Marcar paga
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {parcelas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
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
