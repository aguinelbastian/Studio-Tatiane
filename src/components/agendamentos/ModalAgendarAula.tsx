import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAgendamentoValidacoes } from '@/hooks/useAgendamentoValidacoes'
import { useAgendamentoMutacoes } from '@/hooks/useAgendamentoMutacoes'

export function ModalAgendarAula({
  isOpen,
  onClose,
  slotData,
  clientes,
  profissionais,
  onSuccess,
}: any) {
  const [clienteId, setClienteId] = useState('')
  const [profId, setProfId] = useState('')
  const [validando, setValidando] = useState(false)
  const [erro, setErro] = useState('')
  const [contratoValido, setContratoValido] = useState<any>(null)

  const { podeAgendar } = useAgendamentoValidacoes()
  const { criarAgendamento } = useAgendamentoMutacoes()

  useEffect(() => {
    if (isOpen && slotData) {
      setProfId(slotData.profissionalId === 'todos' ? '' : slotData.profissionalId || '')
      setClienteId('')
      setContratoValido(null)
      setErro('')
    }
  }, [isOpen, slotData])

  const handleValidar = async () => {
    setValidando(true)
    setErro('')
    const res = await podeAgendar(clienteId, profId, slotData.data_hora)
    setValidando(false)
    if (!res.valido) {
      setErro(res.erro || 'Erro de validação')
      toast.error(res.erro)
    } else {
      setContratoValido(res.contrato)
    }
  }

  const handleConfirmar = async () => {
    const res = await criarAgendamento(
      clienteId,
      profId,
      slotData.data_hora,
      'aula',
      contratoValido?.id,
    )
    if (res.sucesso) {
      toast.success('Aula agendada com sucesso')
      onSuccess()
      onClose()
    } else {
      toast.error(res.erro || 'Erro ao agendar')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar Aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <div className="font-medium p-2 bg-muted rounded-md text-sm">
              {slotData &&
                format(new Date(slotData.data_hora), "EEEE, dd 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v)
                setContratoValido(null)
                setErro('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
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
            <Label>Profissional</Label>
            <Select
              value={profId}
              onValueChange={(v) => {
                setProfId(v)
                setContratoValido(null)
                setErro('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
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

          {erro && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{erro}</div>
          )}
          {contratoValido && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
              ✓ Validação ok. Tipo de contrato: <strong>{contratoValido.tipo}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!contratoValido ? (
            <Button onClick={handleValidar} disabled={validando || !clienteId || !profId}>
              {validando ? 'Validando...' : 'Validar Disponibilidade'}
            </Button>
          ) : (
            <Button onClick={handleConfirmar} className="bg-primary text-primary-foreground">
              Confirmar Agendamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
