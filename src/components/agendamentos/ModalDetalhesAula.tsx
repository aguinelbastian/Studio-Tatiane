import React, { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAgendamentoMutacoes } from '@/hooks/useAgendamentoMutacoes'

export function ModalDetalhesAula({ isOpen, onClose, agendamento, onAtualizar }: any) {
  const [loading, setLoading] = useState(false)
  const { cancelarAgendamento, marcarRealizado, marcarFaltaSemAviso, deletarAgendamento } =
    useAgendamentoMutacoes()

  if (!agendamento) return null

  const isAgendado = agendamento.status === 'agendado'
  const isPassado = new Date(agendamento.data_hora) <= new Date()

  const handleAcao = async (
    acaoFn: (id: string) => Promise<{
      sucesso: boolean
      erro?: string
      com_reposicao?: boolean
      repasse?: any
      alerta?: string
    }>,
    messageSuccess: string,
  ) => {
    setLoading(true)
    const res = await acaoFn(agendamento.id)
    setLoading(false)
    if (res.sucesso) {
      if (res.repasse) {
        toast.success(
          `${messageSuccess} Repasse de R$ ${res.repasse.valor.toFixed(2)} registrado para ${res.repasse.profissional}.`,
        )
      } else if (res.alerta) {
        toast.success(`${messageSuccess} (${res.alerta})`)
      } else {
        toast.success(res.com_reposicao ? 'Aula cancelada. Reposição gerada.' : messageSuccess)
      }
      onAtualizar()
      onClose()
    } else {
      toast.error(res.erro || 'Erro na operação')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes da Aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium text-right">{agendamento.clientes?.nome}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Profissional</span>
            <span className="font-medium text-right">{agendamento.profissionais?.nome}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Data/Hora</span>
            <span className="font-medium text-right">
              {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm")}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium capitalize text-right">{agendamento.tipo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <span
              className={cn(
                'font-medium capitalize px-2 py-1 rounded text-xs',
                agendamento.status === 'realizado'
                  ? 'bg-green-100 text-green-700'
                  : agendamento.status === 'cancelado'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700',
              )}
            >
              {agendamento.status}
            </span>
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-4">
          {isAgendado && !isPassado && (
            <Button
              variant="destructive"
              onClick={() => handleAcao(cancelarAgendamento, 'Aula cancelada com sucesso.')}
              disabled={loading}
            >
              Cancelar Aula
            </Button>
          )}
          {isAgendado && isPassado && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleAcao(marcarFaltaSemAviso, 'Falta sem aviso registrada.')}
                disabled={loading}
              >
                Falta sem Aviso
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAcao(marcarRealizado, 'Aula marcada como realizada.')}
                disabled={loading}
              >
                Marcar como Realizada
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => handleAcao(deletarAgendamento, 'Registro excluído.')}
            disabled={loading}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
