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
import { Switch } from '@/components/ui/switch'

export function ModalHorario({ open, onOpenChange, horario, profissionais, onSuccess }: any) {
  const { criarHorario, editarHorario } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const ativo = watch('ativo')

  useEffect(() => {
    if (horario) reset(horario)
    else
      reset({
        dia_semana: 1,
        profissional_id: profissionais[0]?.id || '',
        hora_inicio: '08:00',
        hora_fim: '12:00',
        ativo: true,
      })
  }, [horario, reset, open, profissionais])

  const onSubmit = async (data: any) => {
    if (horario) await editarHorario(horario.id, data)
    else await criarHorario(data)
  }

  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{horario ? 'Editar Horário' : 'Novo Horário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select
              onValueChange={(v) => setValue('profissional_id', v)}
              defaultValue={horario?.profissional_id || profissionais[0]?.id}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dia da Semana</Label>
            <Select
              onValueChange={(v) => setValue('dia_semana', Number(v))}
              defaultValue={horario?.dia_semana?.toString() || '1'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dias.map((d, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora Início</Label>
              <Input {...register('hora_inicio')} type="time" />
            </div>
            <div className="space-y-2">
              <Label>Hora Fim</Label>
              <Input {...register('hora_fim')} type="time" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch checked={ativo} onCheckedChange={(v) => setValue('ativo', v)} />
            <Label>Ativo</Label>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
