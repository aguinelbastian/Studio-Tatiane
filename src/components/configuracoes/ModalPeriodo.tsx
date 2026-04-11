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

export function ModalPeriodo({ open, onOpenChange, periodo, profissionais, onSuccess }: any) {
  const { criarPeriodoFechamento, editarPeriodoFechamento } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (periodo) reset(periodo)
    else reset({ data_inicio: '', data_fim: '', motivo: 'feriado', profissional_id: 'studio' })
  }, [periodo, reset, open])

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      profissional_id: data.profissional_id === 'studio' ? null : data.profissional_id,
    }
    if (periodo) await editarPeriodoFechamento(periodo.id, payload)
    else await criarPeriodoFechamento(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{periodo ? 'Editar Período' : 'Novo Período'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input {...register('data_inicio', { required: true })} type="date" />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input {...register('data_fim', { required: true })} type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select
              onValueChange={(v) => setValue('motivo', v)}
              defaultValue={periodo?.motivo || 'feriado'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="feriado">Feriado</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Abrangência</Label>
            <Select
              onValueChange={(v) => setValue('profissional_id', v)}
              defaultValue={periodo?.profissional_id || 'studio'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="studio">Studio Inteiro</SelectItem>
                {profissionais?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
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