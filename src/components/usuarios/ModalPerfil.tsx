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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function ModalPerfil({ open, onOpenChange, user, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string>('')
  const { register, handleSubmit, reset, watch } = useForm()
  const { toast } = useToast()

  useEffect(() => {
    if (user && open) {
      reset({ nome: user.nome, email: user.email })
      setFotoUrl(
        user.avatar_url ||
          `https://img.usecurling.com/ppl/thumbnail?gender=${user.role === 'admin' ? 'female' : 'male'}&seed=${user.id}`,
      )
    }
    setFoto(null)
  }, [user, reset, open])

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(e.target.files[0])
      setFotoUrl(URL.createObjectURL(e.target.files[0]))
    }
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      let avatarUrl = user?.avatar_url || null

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

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: data.nome,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      toast({ title: 'Perfil atualizado com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Meu Perfil</DialogTitle>
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
                id="perfil-foto"
                className="hidden"
                accept="image/*"
                onChange={handleFotoChange}
              />
              <Label
                htmlFor="perfil-foto"
                className="cursor-pointer text-sm text-primary flex items-center hover:underline"
              >
                <Upload className="mr-2 h-4 w-4" />
                Alterar Foto
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input {...register('nome', { required: true })} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input {...register('email')} type="email" disabled />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado por aqui.
            </p>
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
