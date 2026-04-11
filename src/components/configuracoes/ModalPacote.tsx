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

export function ModalPacote({ open, onOpenChange, pacote, onSuccess }: any) {
  const { criarPacote, editarPacote } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (pacote) reset(pacote)
    else
      reset({
        nome: '',
        tipo: 'pilates',
        quantidade_sessoes: 10,
        preco: 0,
        validade_dias: 90,
        ativo: true,
      })
  }, [pacote, reset, open])

  const onSubmit = async (data: any) => {
    if (pacote) await editarPacote(pacote.id, data)
    else await criarPacote(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pacote ? 'Editar Pacote' : 'Novo Pacote'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Pacote</Label>
            <Input {...register('nome', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              onValueChange={(v) => setValue('tipo', v)}
              defaultValue={pacote?.tipo || 'pilates'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pilates">Pilates</SelectItem>
                <SelectItem value="massoterapia">Massoterapia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade de Sessões</Label>
              <Input {...register('quantidade_sessoes')} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input {...register('preco')} type="number" step="0.01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Validade (Dias)</Label>
            <Select
              onValueChange={(v) => setValue('validade_dias', Number(v))}
              defaultValue={pacote?.validade_dias?.toString() || '90'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
