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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function ModalUsuario({ open, onOpenChange, usuario, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const { toast } = useToast()
  const ativo = watch('status') === 'ativo'

  useEffect(() => {
    if (usuario) {
      reset({
        nome: usuario.nome,
        role: usuario.role,
        status: usuario.status,
      })
    } else {
      reset({
        nome: '',
        role: 'professor',
        status: 'ativo',
      })
    }
  }, [usuario, reset, open])

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: data.nome,
          role: data.role,
          status: data.status,
        })
        .eq('id', usuario.id)

      if (error) throw error

      toast({ title: 'Usuário atualizado com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...register('nome', { required: true })} placeholder="Nome do usuário" />
          </div>

          <div className="space-y-2">
            <Label>Perfil (Role)</Label>
            <Select
              onValueChange={(v) => setValue('role', v)}
              defaultValue={usuario?.role || 'professor'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superuser">Superuser</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="massoterapeuta">Massoterapeuta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              checked={ativo}
              onCheckedChange={(v) => setValue('status', v ? 'ativo' : 'inativo')}
            />
            <Label>Ativo no Sistema</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
