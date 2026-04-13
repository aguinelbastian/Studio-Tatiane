import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { CalendarioAgendamentos } from '@/components/agendamentos/CalendarioAgendamentos'
import { ModalAgendarAula } from '@/components/agendamentos/ModalAgendarAula'
import { ModalDetalhesAula } from '@/components/agendamentos/ModalDetalhesAula'
import { ModalAgendarReposicao } from '@/components/agendamentos/ModalAgendarReposicao'
import { FilaReposicoesPendentes } from '@/components/agendamentos/FilaReposicoesPendentes'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAgendamentoMutacoes } from '@/hooks/useAgendamentoMutacoes'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [reposicoes, setReposicoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for list
  const [filterCliente, setFilterCliente] = useState('todos')
  const [filterProf, setFilterProf] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')

  // Modal States
  const [isAgendarOpen, setIsAgendarOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    data_hora: string
    profissionalId: string
  } | null>(null)
  const [agendamentoEdicao, setAgendamentoEdicao] = useState<any>(null)

  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null)

  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [selectedReposicao, setSelectedReposicao] = useState<any>(null)

  const { deletarAgendamento, marcarStatusAula, editarAgendamento } = useAgendamentoMutacoes()

  const handleStatusChange = async (id: string, novoStatus: string) => {
    if (['realizado', 'falta_sem_aviso', 'a_repor'].includes(novoStatus)) {
      const res = await marcarStatusAula(id, novoStatus as any)
      if (res.sucesso) {
        toast.success('Status atualizado com sucesso')
        fetchData()
      } else {
        toast.error(res.erro || 'Erro ao atualizar status')
      }
    } else {
      const res = await editarAgendamento(id, { status: novoStatus })
      if (res.sucesso) {
        toast.success('Status atualizado com sucesso')
        fetchData()
      } else {
        toast.error(res.erro || 'Erro ao atualizar status')
      }
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const dateLimit = new Date()
    dateLimit.setMonth(dateLimit.getMonth() - 2)

    const [agendRes, profRes, cliRes, repRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('*, clientes(nome), profissionais(nome, cor_calendario)')
        .gte('data_hora', dateLimit.toISOString())
        .order('data_hora', { ascending: true }),
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
    setAgendamentoEdicao(null)
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

  const handleEdit = (agendamento: any) => {
    if (['realizado', 'falta_sem_aviso'].includes(agendamento.status)) {
      toast.error('Não é possível editar um agendamento já realizado ou com falta.')
      return
    }
    setAgendamentoEdicao(agendamento)
    setSelectedSlot(null)
    setIsAgendarOpen(true)
  }

  const handleDelete = async (agendamento: any) => {
    if (['realizado', 'falta_sem_aviso'].includes(agendamento.status)) {
      toast.error('Não é possível deletar um agendamento já realizado ou com falta.')
      return
    }
    if (
      confirm('Tem certeza que deseja deletar este agendamento? Esta ação não pode ser desfeita.')
    ) {
      const res = await deletarAgendamento(agendamento.id)
      if (res.sucesso) {
        toast.success('Agendamento deletado com sucesso')
        fetchData()
      } else {
        toast.error(res.erro || 'Erro ao deletar agendamento')
      }
    }
  }

  const filteredAgendamentos = agendamentos.filter((a) => {
    if (filterCliente !== 'todos' && a.cliente_id !== filterCliente) return false
    if (filterProf !== 'todos' && a.profissional_id !== filterProf) return false
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agendamentos</h2>
          <p className="text-muted-foreground">
            Gerencie a agenda de aulas, validações e reposições do estúdio.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedSlot(null)
            setAgendamentoEdicao(null)
            setIsAgendarOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 h-[calc(100vh-12rem)]">
        <Tabs defaultValue="calendario" className="flex-1 flex flex-col h-full min-w-0">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="flex-1 flex flex-col h-full min-w-0 m-0">
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
          </TabsContent>

          <TabsContent
            value="lista"
            className="flex-1 flex flex-col h-full min-w-0 m-0 bg-card rounded-lg border shadow-sm"
          >
            <div className="p-4 border-b flex flex-wrap gap-4 bg-muted/20">
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Clientes</SelectItem>
                  {clientes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProf} onValueChange={setFilterProf}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Profissionais</SelectItem>
                  {profissionais.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="falta_sem_aviso">Falta sem aviso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgendamentos.map((ag) => (
                    <TableRow key={ag.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(ag.data_hora), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{ag.clientes?.nome}</TableCell>
                      <TableCell>{ag.profissionais?.nome}</TableCell>
                      <TableCell className="capitalize">{ag.tipo}</TableCell>
                      <TableCell>
                        <Select
                          value={ag.status}
                          onValueChange={(val) => handleStatusChange(ag.id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agendado">Agendado</SelectItem>
                            <SelectItem value="realizado">Realizado</SelectItem>
                            <SelectItem value="falta_sem_aviso">Falta sem aviso</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                            <SelectItem value="a_repor">A repor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(ag)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ag)}
                          className="text-destructive"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgendamentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum agendamento encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

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
        agendamentoEdicao={agendamentoEdicao}
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
