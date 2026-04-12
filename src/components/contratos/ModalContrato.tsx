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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'

export function ModalContrato({
  open,
  onOpenChange,
  contrato,
  clientes,
  planos,
  pacotes,
  onSuccess,
}: any) {
  const { criarContrato, editarContrato } = useClientesMutacoes(onSuccess)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const tipo = watch('tipo')

  useEffect(() => {
    if (contrato) {
      reset({
        cliente_id: contrato.cliente_id,
        tipo: contrato.tipo,
        plano_id: contrato.plano_id || '',
        pacote_id: contrato.pacote_id || '',
        data_inicio: contrato.data_inicio,
        preco_pago: contrato.preco_pago,
        status: contrato.status,
        modelo_cobranca: contrato.modelo_cobranca || 'antecipado',
        quantidade_parcelas: contrato.quantidade_parcelas || 1,
      })
    } else {
      reset({
        cliente_id: '',
        tipo: 'plano',
        plano_id: '',
        pacote_id: '',
        data_inicio: new Date().toISOString().split('T')[0],
        preco_pago: 0,
        status: 'ativo',
        modelo_cobranca: 'antecipado',
        quantidade_parcelas: 1,
      })
    }
  }, [contrato, reset, open])

  const modeloCobranca = watch('modelo_cobranca')

  const handleEntityChange = (val: string) => {
    if (tipo === 'plano') {
      setValue('plano_id', val)
      const pl = planos.find((p: any) => p.id === val)
      if (pl) setValue('preco_pago', pl.preco)
    } else {
      setValue('pacote_id', val)
      const pa = pacotes.find((p: any) => p.id === val)
      if (pa) setValue('preco_pago', pa.preco)
    }
  }

  const onSubmit = async (data: any) => {
    if (data.tipo === 'plano') data.pacote_id = null
    if (data.tipo === 'pacote') data.plano_id = null

    if (contrato) await editarContrato(contrato.id, data)
    else await criarContrato(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contrato ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              onValueChange={(v) => setValue('cliente_id', v)}
              defaultValue={contrato?.cliente_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              defaultValue={tipo}
              onValueChange={(v) => setValue('tipo', v)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plano" id="r1" />
                <Label htmlFor="r1">Plano</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pacote" id="r2" />
                <Label htmlFor="r2">Pacote</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>{tipo === 'plano' ? 'Plano' : 'Pacote'}</Label>
            <Select
              onValueChange={handleEntityChange}
              defaultValue={tipo === 'plano' ? contrato?.plano_id : contrato?.pacote_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {tipo === 'plano'
                  ? planos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))
                  : pacotes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input {...register('data_inicio')} type="date" />
            </div>
            <div className="space-y-2">
              <Label>Preço Pago/Total (R$)</Label>
              <Input {...register('preco_pago')} type="number" step="0.01" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modelo de Cobrança</Label>
            <RadioGroup
              value={modeloCobranca}
              onValueChange={(v) => setValue('modelo_cobranca', v)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="antecipado" id="mod1" />
                <Label htmlFor="mod1">Antecipado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parcelado" id="mod2" />
                <Label htmlFor="mod2">Parcelado</Label>
              </div>
            </RadioGroup>
          </div>

          {modeloCobranca === 'parcelado' && (
            <div className="space-y-2">
              <Label>Quantidade de Parcelas</Label>
              <Input {...register('quantidade_parcelas')} type="number" min="1" />
            </div>
          )}

          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
