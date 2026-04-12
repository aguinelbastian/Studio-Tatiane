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
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function ModalProfissional({ open, onOpenChange, profissional, onSuccess }: any) {
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data } = await supabase.from('usuarios').select('id, nome, email, role')
      if (data) setUsuarios(data)
    }
    if (open) fetchUsuarios()
  }, [open])

  useEffect(() => {
    if (profissional) {
      reset({
        ...profissional,
        aluguel_fixo_mensal: profissional.aluguel_fixo_mensal || '',
      })
    } else {
      reset({
        nome: '',
        tipo: 'professor',
        comissao_percentual: 0,
        aluguel_fixo_mensal: '',
        cor_calendario: '#3B82F6',
        status: 'ativo',
        usuario_id: '',
      })
    }
  }, [profissional, reset, open])

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        aluguel_fixo_mensal: data.aluguel_fixo_mensal ? Number(data.aluguel_fixo_mensal) : null,
        comissao_percentual: Number(data.comissao_percentual),
      }

      if (profissional) {
        const { error } = await supabase
          .from('profissionais')
          .update(payload)
          .eq('id', profissional.id)
        if (error) throw error
        toast.success('Profissional atualizado')
      } else {
        if (!payload.usuario_id) throw new Error('Selecione um usuário vinculado')
        const { error } = await supabase.from('profissionais').insert([payload])
        if (error) throw error
        toast.success('Profissional criado')
      }
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{profissional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!profissional && (
            <div className="space-y-2">
              <Label>Usuário Vinculado *</Label>
              <Select
                onValueChange={(v) => {
                  setValue('usuario_id', v)
                  const user = usuarios.find((u) => u.id === v)
                  if (user && !watch('nome')) setValue('nome', user.nome)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('nome', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                defaultValue={watch('tipo') || 'professor'}
                onValueChange={(v) => setValue('tipo', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professor">Professor(a)</SelectItem>
                  <SelectItem value="massoterapeuta">Massoterapeuta</SelectItem>
                  <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                  <SelectItem value="nutricionista">Nutricionista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue={watch('status') || 'ativo'}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Comissão (%) *</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('comissao_percentual', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Aluguel Fixo (R$)</Label>
              <Input type="number" step="0.01" min="0" {...register('aluguel_fixo_mensal')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor do Calendário</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                {...register('cor_calendario')}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input type="text" {...register('cor_calendario')} className="flex-1" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
