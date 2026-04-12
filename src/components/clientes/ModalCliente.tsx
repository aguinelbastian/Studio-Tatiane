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
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'
import { supabase } from '@/lib/supabase/client'

function validarCPF(cpf: string) {
  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false
  return true
}

export function ModalCliente({ open, onOpenChange, cliente, onSuccess }: any) {
  const { criarCliente, editarCliente } = useClientesMutacoes(onSuccess)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm()
  const [hasRealizado, setHasRealizado] = useState(false)
  const [loading, setLoading] = useState(false)

  const cpfValue = watch('cpf')

  useEffect(() => {
    if (open && cliente) {
      reset({
        nome: cliente.nome,
        cpf: cliente.cpf || '',
        telefone: cliente.telefone,
        email: cliente.email,
        status: cliente.status,
        data_inicio: cliente.data_inicio,
      })

      supabase
        .from('agendamentos')
        .select('id')
        .eq('cliente_id', cliente.id)
        .eq('status', 'realizado')
        .limit(1)
        .then(({ data }) => {
          setHasRealizado(data && data.length > 0)
        })
    } else if (open) {
      reset({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        status: 'ativo',
        data_inicio: new Date().toISOString().split('T')[0],
      })
      setHasRealizado(false)
    }
  }, [cliente, reset, open])

  const onSubmit = async (data: any) => {
    if (data.cpf && !validarCPF(data.cpf)) {
      setError('cpf', { type: 'manual', message: 'CPF inválido. Digite 11 dígitos.' })
      return
    }

    try {
      setLoading(true)

      if (data.cpf) {
        const query = supabase.from('clientes').select('id').eq('cpf', data.cpf)
        if (cliente) {
          query.neq('id', cliente.id)
        }
        const { data: existingCpf } = await query.limit(1)

        if (existingCpf && existingCpf.length > 0) {
          setError('cpf', {
            type: 'manual',
            message: 'Este CPF já está cadastrado em outro cliente.',
          })
          setLoading(false)
          return
        }
      }

      if (cliente) await editarCliente(cliente.id, data)
      else await criarCliente(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.slice(0, 11)
    setValue('cpf', value)
    if (errors.cpf) clearErrors('cpf')
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
              <Label>E-mail</Label>
              <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={cpfValue || ''}
                onChange={handleCpfChange}
                placeholder="Apenas números (11 dígitos)"
                disabled={hasRealizado}
                maxLength={11}
              />
              {errors.cpf && (
                <span className="text-xs text-destructive">{errors.cpf.message as string}</span>
              )}
              {hasRealizado && (
                <span className="text-xs text-muted-foreground block mt-1">
                  Não é possível alterar CPF de cliente com aulas realizadas.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register('telefone')} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input {...register('data_inicio')} type="date" />
            </div>
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

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
