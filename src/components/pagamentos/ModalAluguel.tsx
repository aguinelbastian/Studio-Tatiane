import { useEffect } from 'react'
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
import { toast } from 'sonner'

export function ModalAluguel({ open, onOpenChange, aluguel, profissionais, onSuccess }: any) {
  const { salvarAluguel } = usePagamentosMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (aluguel) {
      reset({
        profissional_id: aluguel.profissional_id,
        valor: aluguel.valor,
        data_pagamento: aluguel.data_pagamento,
        metodo_pagamento: aluguel.metodo_pagamento,
        observacoes: aluguel.observacoes,
        status: aluguel.status,
      })
    } else {
      reset({
        profissional_id: '',
        valor: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        metodo_pagamento: 'pix',
        observacoes: '',
        status: 'pago',
      })
    }
  }, [aluguel, reset, open])

  const onSubmit = async (data: any) => {
    const res = await salvarAluguel(data)
    if (res.sucesso) {
      toast.success('Aluguel salvo com sucesso!')
      onOpenChange(false)
    } else {
      toast.error(res.erro || 'Erro ao salvar aluguel')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aluguel ? 'Editar Aluguel' : 'Novo Aluguel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Profissional / Parceiro</Label>
            <Select
              onValueChange={(v) => setValue('profissional_id', v)}
              defaultValue={aluguel?.profissional_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.tipo})
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
                onValueChange={(v) => setValue('metodo_pagamento', v)}
                defaultValue={aluguel?.metodo_pagamento || 'pix'}
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
              <Label>Status</Label>
              <Select
                onValueChange={(v) => setValue('status', v)}
                defaultValue={aluguel?.status || 'pago'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
