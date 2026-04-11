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

export function ModalPlano({ open, onOpenChange, plano, onSuccess }: any) {
  const { criarPlano, editarPlano } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (plano) {
      reset(plano)
    } else {
      reset({
        nome: '',
        tipo: 'regular',
        frequencia: 1,
        duracao_dias: 30,
        preco: 0,
        renovacao_tipo: 'automatica',
        ativo: true,
      })
    }
  }, [plano, reset, open])

  const onSubmit = async (data: any) => {
    if (plano) await editarPlano(plano.id, data)
    else await criarPlano(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plano ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Plano</Label>
            <Input {...register('nome', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência (vezes/semana)</Label>
              <Input {...register('frequencia')} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input {...register('preco')} type="number" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duração (Dias)</Label>
              <Select
                onValueChange={(v) => setValue('duracao_dias', Number(v))}
                defaultValue={plano?.duracao_dias?.toString() || '30'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias (Mensal)</SelectItem>
                  <SelectItem value="90">90 dias (Trimestral)</SelectItem>
                  <SelectItem value="180">180 dias (Semestral)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Renovação</Label>
              <Select
                onValueChange={(v) => setValue('renovacao_tipo', v)}
                defaultValue={plano?.renovacao_tipo || 'automatica'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatica">Automática</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
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
