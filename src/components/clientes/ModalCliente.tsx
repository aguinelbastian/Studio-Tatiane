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
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'

export function ModalCliente({ open, onOpenChange, cliente, onSuccess }: any) {
  const { criarCliente, editarCliente } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (cliente) {
      reset({
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email,
        status: cliente.status,
        data_inicio: cliente.data_inicio,
      })
    } else {
      reset({
        nome: '',
        telefone: '',
        email: '',
        status: 'ativo',
        data_inicio: new Date().toISOString().split('T')[0],
      })
    }
  }, [cliente, reset, open])

  const onSubmit = async (data: any) => {
    if (cliente) await editarCliente(cliente.id, data)
    else await criarCliente(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...register('nome', { required: true })} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register('telefone')} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input {...register('data_inicio')} type="date" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue={cliente?.status || 'ativo'}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
