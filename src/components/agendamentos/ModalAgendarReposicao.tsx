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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAgendamentoValidacoes } from '@/hooks/useAgendamentoValidacoes'
import { useAgendamentoMutacoes } from '@/hooks/useAgendamentoMutacoes'

export function ModalAgendarReposicao({
  isOpen,
  onClose,
  reposicao,
  profissionais,
  onSuccess,
}: any) {
  const [dataStr, setDataStr] = useState('')
  const [horaStr, setHoraStr] = useState('')
  const [profId, setProfId] = useState('')
  const [loading, setLoading] = useState(false)

  const { podeMarcarReposicao } = useAgendamentoValidacoes()
  const { marcarReposicao } = useAgendamentoMutacoes()

  useEffect(() => {
    if (isOpen && reposicao) {
      setProfId(reposicao.profissional_id || '')
      setDataStr('')
      setHoraStr('')
    }
  }, [isOpen, reposicao])

  const handleConfirmar = async () => {
    if (!dataStr || !horaStr || !profId) {
      toast.error('Preencha todos os campos')
      return
    }

    setLoading(true)
    const dataHora = `${dataStr}T${horaStr}:00`

    const resVal = await podeMarcarReposicao(reposicao.id, profId, dataHora)
    if (!resVal.valido) {
      toast.error(resVal.erro)
      setLoading(false)
      return
    }

    const resMut = await marcarReposicao(reposicao.id, profId, dataHora)
    setLoading(false)
    if (resMut.sucesso) {
      toast.success('Reposição marcada com sucesso')
      onSuccess()
      onClose()
    } else {
      toast.error(resMut.erro || 'Erro ao marcar reposição')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar Reposição</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-1 bg-muted p-3 rounded-md">
            <Label className="text-xs text-muted-foreground uppercase">Cliente</Label>
            <div className="font-medium">{reposicao?.clientes?.nome}</div>
          </div>
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={horaStr} onChange={(e) => setHoraStr(e.target.value)} />
            </div>
          </div>
          {reposicao && (
            <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
              Reposição válida até{' '}
              <strong>{format(new Date(reposicao.data_limite + 'T12:00:00'), 'dd/MM/yyyy')}</strong>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading}>
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
