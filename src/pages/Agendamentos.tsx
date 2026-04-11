import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { CalendarioAgendamentos } from '@/components/agendamentos/CalendarioAgendamentos'
import { ModalAgendarAula } from '@/components/agendamentos/ModalAgendarAula'
import { ModalDetalhesAula } from '@/components/agendamentos/ModalDetalhesAula'
import { ModalAgendarReposicao } from '@/components/agendamentos/ModalAgendarReposicao'
import { FilaReposicoesPendentes } from '@/components/agendamentos/FilaReposicoesPendentes'
import { Skeleton } from '@/components/ui/skeleton'

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [reposicoes, setReposicoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal States
  const [isAgendarOpen, setIsAgendarOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    data_hora: string
    profissionalId: string
  } | null>(null)

  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null)

  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [selectedReposicao, setSelectedReposicao] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    const dateLimit = new Date()
    dateLimit.setMonth(dateLimit.getMonth() - 2) // fetch last 2 months + future

    const [agendRes, profRes, cliRes, repRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('*, clientes(nome), profissionais(nome, cor_calendario)')
        .gte('data_hora', dateLimit.toISOString()),
      supabase.from('profissionais').select('*').eq('status', 'ativo'),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase
        .from('reposicoes')
        .select('*, clientes(nome), profissionais(nome)')
        .eq('status', 'pendente'),
    ])

    if (agendRes.data) setAgendamentos(agendRes.data)
    if (profRes.data) setProfissionais(profRes.data)
    if (cliRes.data) setClientes(cliRes.data)
    if (repRes.data) setReposicoes(repRes.data)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSlotClick = (datetime: Date, profFilter: string) => {
    setSelectedSlot({
      data_hora: format(datetime, "yyyy-MM-dd'T'HH:mm:00"),
      profissionalId: profFilter !== 'todos' ? profFilter : '',
    })
    setIsAgendarOpen(true)
  }

  const handleEventClick = (agendamento: any) => {
    setSelectedAgendamento(agendamento)
    setIsDetalhesOpen(true)
  }

  const handleMarcarReposicaoClick = (reposicao: any) => {
    setSelectedReposicao(reposicao)
    setIsReposicaoOpen(true)
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agendamentos</h2>
        <p className="text-muted-foreground">
          Gerencie a agenda de aulas, validações e reposições do estúdio.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 h-[calc(100vh-12rem)]">
        <div className="flex-1 flex flex-col h-full min-w-0">
          {loading ? (
            <Skeleton className="w-full h-full rounded-xl" />
          ) : (
            <CalendarioAgendamentos
              agendamentos={agendamentos}
              profissionais={profissionais}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        <div className="w-full lg:w-[300px] flex-shrink-0 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <FilaReposicoesPendentes
              reposicoes={reposicoes}
              onMarcar={handleMarcarReposicaoClick}
            />
          )}
        </div>
      </div>

      <ModalAgendarAula
        isOpen={isAgendarOpen}
        onClose={() => setIsAgendarOpen(false)}
        slotData={selectedSlot}
        clientes={clientes}
        profissionais={profissionais}
        onSuccess={fetchData}
      />

      <ModalDetalhesAula
        isOpen={isDetalhesOpen}
        onClose={() => setIsDetalhesOpen(false)}
        agendamento={selectedAgendamento}
        onAtualizar={fetchData}
      />

      <ModalAgendarReposicao
        isOpen={isReposicaoOpen}
        onClose={() => setIsReposicaoOpen(false)}
        reposicao={selectedReposicao}
        profissionais={profissionais}
        onSuccess={fetchData}
      />
    </div>
  )
}
