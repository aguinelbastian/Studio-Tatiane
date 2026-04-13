import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePagamentosMutacoes } from '@/hooks/usePagamentosMutacoes'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function ModalPagamentoAluno({ open, onOpenChange, pagamento, clientes, onSuccess }: any) {
  const { salvarPagamentoAluno } = usePagamentosMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()
  const [contratos, setContratos] = useState<any[]>([])

  useEffect(() => {
    if (pagamento) {
      reset({
        cliente_id: pagamento.cliente_id,
        contrato_id: pagamento.contrato_id,
        valor: pagamento.valor,
        data_pagamento: pagamento.data_pagamento,
        metodo: pagamento.metodo,
        tipo_pagamento: pagamento.tipo_pagamento || 'plano',
        observacoes: pagamento.observacoes,
        status: pagamento.status,
      })
    } else {
      reset({
        cliente_id: '',
        contrato_id: '',
        valor: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        metodo: 'pix',
        tipo_pagamento: 'plano',
        observacoes: '',
        status: 'pendente',
      })
    }
  }, [pagamento, reset, open])

  const loadContratos = async (clienteId: string) => {
    if (!clienteId) return
    const { data } = await supabase
      .from('contratos_cliente')
      .select('id, tipo')
      .eq('cliente_id', clienteId)
    setContratos(data || [])
    if (data && data.length > 0) setValue('contrato_id', data[0].id)
  }

  const onSubmit = async (data: any) => {
    if (!data.contrato_id) {
      toast.error('O cliente precisa ter um contrato para registrar pagamento.')
      return
    }
    const res = await salvarPagamentoAluno(data)
    if (res.sucesso) {
      toast.success('Pagamento salvo com sucesso!')
      onOpenChange(false)
    } else {
      toast.error(res.erro || 'Erro ao salvar pagamento')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pagamento ? 'Editar Pagamento' : 'Novo Pagamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              onValueChange={(v) => {
                setValue('cliente_id', v)
                loadContratos(v)
              }}
              defaultValue={pagamento?.cliente_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {clientes
                  .filter((c: any) => c.status === 'ativo')
                  .map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input {...register('valor')} type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Data de Pagamento</Label>
              <Input {...register('data_pagamento')} type="date" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                onValueChange={(v) => setValue('metodo', v)}
                defaultValue={pagamento?.metodo || 'pix'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <Select
                onValueChange={(v) => setValue('tipo_pagamento', v)}
                defaultValue={pagamento?.tipo_pagamento || 'plano'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plano">Plano/Pacote</SelectItem>
                  <SelectItem value="aula_avulsa">Aula Avulsa</SelectItem>
                  <SelectItem value="parcela">Parcela</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              onValueChange={(v) => setValue('status', v)}
              defaultValue={pagamento?.status || 'pendente'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input {...register('observacoes')} />
          </div>

          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
