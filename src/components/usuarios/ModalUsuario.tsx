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
import { Loader2, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function ModalUsuario({ open, onOpenChange, usuario, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string>('')
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const { toast } = useToast()
  const ativo = watch('status') === 'ativo'

  useEffect(() => {
    if (usuario) {
      reset({
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        status: usuario.status,
      })
      setFotoUrl(usuario.avatar_url || '')
    } else {
      reset({
        nome: '',
        email: '',
        senha: '',
        role: 'professor',
        status: 'ativo',
      })
      setFotoUrl('')
    }
    setFoto(null)
  }, [usuario, reset, open])

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(e.target.files[0])
      setFotoUrl(URL.createObjectURL(e.target.files[0]))
    }
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      let avatarUrl = usuario?.avatar_url || null

      if (foto) {
        const fileExt = foto.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, foto)

        if (uploadErr) throw uploadErr

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
        avatarUrl = publicUrl
      }

      if (!usuario) {
        const { error } = await supabase.rpc('create_new_user', {
          p_email: data.email,
          p_password: data.senha,
          p_nome: data.nome,
          p_role: data.role,
          p_avatar_url: avatarUrl,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome: data.nome,
            role: data.role,
            status: data.status,
            avatar_url: avatarUrl,
          })
          .eq('id', usuario.id)
        if (error) throw error
      }

      toast({ title: usuario ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!' })
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
          <DialogTitle>{usuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="flex flex-col items-center justify-center space-y-2 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={fotoUrl} />
              <AvatarFallback>{watch('nome')?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="foto-upload"
                className="hidden"
                accept="image/*"
                onChange={handleFotoChange}
              />
              <Label
                htmlFor="foto-upload"
                className="cursor-pointer text-sm text-primary flex items-center hover:underline"
              >
                <Upload className="mr-2 h-4 w-4" />
                Alterar Foto
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input {...register('nome', { required: true })} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                {...register('email', { required: true })}
                type="email"
                placeholder="E-mail"
                disabled={!!usuario}
              />
            </div>
          </div>

          {!usuario && (
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                {...register('senha', { required: !usuario })}
                type="password"
                placeholder="Senha"
              />
            </div>
          )}

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
