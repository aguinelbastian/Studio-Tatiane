import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAgendamentoValidacoes } from '@/hooks/useAgendamentoValidacoes'
import { useAgendamentoMutacoes } from '@/hooks/useAgendamentoMutacoes'

export function ModalAgendarAula({
  isOpen,
  onClose,
  slotData,
  agendamentoEdicao,
  clientes,
  profissionais,
  onSuccess,
}: any) {
  const [clienteId, setClienteId] = useState('')
  const [profId, setProfId] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [tipo, setTipo] = useState('aula')
  const [validando, setValidando] = useState(false)
  const [erro, setErro] = useState('')
  const [contratoValido, setContratoValido] = useState<any>(null)

  const { podeAgendar } = useAgendamentoValidacoes()
  const { criarAgendamento, editarAgendamento } = useAgendamentoMutacoes()

  useEffect(() => {
    if (isOpen) {
      if (agendamentoEdicao) {
        setClienteId(agendamentoEdicao.cliente_id)
        setProfId(agendamentoEdicao.profissional_id)
        const dateObj = new Date(agendamentoEdicao.data_hora)
        const tzOffset = dateObj.getTimezoneOffset() * 60000
        const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16)
        setDataHora(localISOTime)
        setTipo(agendamentoEdicao.tipo || 'aula')
      } else if (slotData) {
        setProfId(slotData.profissionalId === 'todos' ? '' : slotData.profissionalId || '')
        setDataHora(slotData.data_hora.slice(0, 16))
        setClienteId('')
        setTipo('aula')
      } else {
        setClienteId('')
        setProfId('')
        setDataHora('')
        setTipo('aula')
      }
      setContratoValido(null)
      setErro('')
    }
  }, [isOpen, slotData, agendamentoEdicao])

  const handleValidar = async () => {
    if (!clienteId || !profId || !dataHora) {
      setErro('Preencha todos os campos obrigatórios')
      return
    }

    const dateObj = new Date(dataHora)
    if (dateObj < new Date()) {
      setErro('Não é permitido agendar no passado')
      return
    }

    const isoString = dateObj.toISOString()

    setValidando(true)
    setErro('')
    const res = await podeAgendar(clienteId, profId, isoString)
    setValidando(false)
    if (!res.valido) {
      setErro(res.erro || 'Erro de validação')
      toast.error(res.erro)
    } else {
      setContratoValido(res.contrato)
    }
  }

  const handleConfirmar = async () => {
    const isoString = new Date(dataHora).toISOString()

    if (agendamentoEdicao) {
      const payload = {
        cliente_id: clienteId,
        profissional_id: profId,
        data_hora: isoString,
        tipo,
      }
      const res = await editarAgendamento(agendamentoEdicao.id, payload)
      if (res.sucesso) {
        toast.success('Agendamento atualizado com sucesso')
        onSuccess()
        onClose()
      } else {
        toast.error(res.erro || 'Erro ao atualizar')
      }
    } else {
      const res = await criarAgendamento(clienteId, profId, isoString, tipo, contratoValido?.id)
      if (res.sucesso) {
        toast.success('Agendamento criado com sucesso')
        onSuccess()
        onClose()
      } else {
        toast.error(res.erro || 'Erro ao agendar')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{agendamentoEdicao ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data e Hora *</Label>
            <Input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => {
                setDataHora(e.target.value)
                setContratoValido(null)
                setErro('')
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Cliente *</Label>
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
            <Label>Profissional *</Label>
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
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aula">Aula</SelectItem>
                <SelectItem value="sessao">Sessão</SelectItem>
                <SelectItem value="reposicao">Reposição</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {erro && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{erro}</div>
          )}
          {contratoValido && !agendamentoEdicao && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
              ✓ Validação ok. Tipo de contrato: <strong>{contratoValido.tipo}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!contratoValido && !agendamentoEdicao ? (
            <Button
              onClick={handleValidar}
              disabled={validando || !clienteId || !profId || !dataHora}
            >
              {validando ? 'Validando...' : 'Validar Disponibilidade'}
            </Button>
          ) : (
            <Button onClick={handleConfirmar} className="bg-primary text-primary-foreground">
              Confirmar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
