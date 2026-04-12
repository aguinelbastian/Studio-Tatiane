import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilePlus, Edit, Pause, Play, XCircle, List } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ModalContrato } from '@/components/contratos/ModalContrato'
import { ModalParcelas } from '@/components/contratos/ModalParcelas'

export default function Contratos() {
  const [contratos, setContratos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [planos, setPlanos] = useState<any[]>([])
  const [pacotes, setPacotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDados = async () => {
    setLoading(true)
    const [dContratos, dClientes, dPlanos, dPacotes] = await Promise.all([
      supabase
        .from('contratos_cliente')
        .select('*, clientes(nome), planos(nome), pacotes(nome)')
        .order('data_criacao', { ascending: false }),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('planos').select('*').order('nome'),
      supabase.from('pacotes').select('*').order('nome'),
    ])
    setContratos(dContratos.data || [])
    setClientes(dClientes.data || [])
    setPlanos(dPlanos.data || [])
    setPacotes(dPacotes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [])

  const { pausarContrato, cancelarContrato } = useClientesMutacoes(fetchDados)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalParcelasOpen, setModalParcelasOpen] = useState(false)
  const [contratoSelecionado, setContratoSelecionado] = useState<any>(null)

  const handleEdit = (contrato: any) => {
    setContratoSelecionado(contrato)
    setModalOpen(true)
  }
  const handleParcelas = (contrato: any) => {
    setContratoSelecionado(contrato)
    setModalParcelasOpen(true)
  }

  const handleTogglePausa = async (id: string, isPausado: boolean) => {
    if (confirm(isPausado ? 'Reativar contrato?' : 'Pausar/Trancar este contrato?')) {
      await supabase
        .from('contratos_cliente')
        .update({ status: isPausado ? 'ativo' : 'trancado' })
        .eq('id', id)
      fetchDados()
    }
  }

  const contratosAtivos = contratos.filter((c) => c.status === 'ativo')
  const contratosPausados = contratos.filter(
    (c) => c.status === 'trancado' || c.status === 'pausado',
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">Gerenciamento de planos, pacotes e parcelas.</p>
        </div>
        <Button
          onClick={() => {
            setContratoSelecionado(null)
            setModalOpen(true)
          }}
        >
          <FilePlus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Contratos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano/Pacote</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosAtivos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.clientes?.nome}</TableCell>
                      <TableCell>
                        {item.tipo === 'plano' ? item.planos?.nome : item.pacotes?.nome}
                      </TableCell>
                      <TableCell>
                        {new Date(item.data_inicio).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="capitalize">
                        {item.modelo_cobranca || 'antecipado'}
                      </TableCell>
                      <TableCell>{item.quantidade_parcelas || 1}x</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleParcelas(item)}
                          title="Ver Parcelas"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePausa(item.id, false)}
                          title="Pausar/Trancar"
                        >
                          <Pause className="h-4 w-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelarContrato(item.id, 0)}
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {contratosAtivos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Nenhum contrato ativo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contratos Pausados/Trancados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano/Pacote</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosPausados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.clientes?.nome}</TableCell>
                      <TableCell>
                        {item.tipo === 'plano' ? item.planos?.nome : item.pacotes?.nome}
                      </TableCell>
                      <TableCell>
                        {new Date(item.data_inicio).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePausa(item.id, true)}
                          title="Ativar"
                        >
                          <Play className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {contratosPausados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Nenhum contrato pausado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <ModalContrato
        open={modalOpen}
        onOpenChange={setModalOpen}
        contrato={contratoSelecionado}
        clientes={clientes}
        planos={planos}
        pacotes={pacotes}
        onSuccess={() => {
          setModalOpen(false)
          fetchDados()
        }}
      />
      <ModalParcelas
        open={modalParcelasOpen}
        onOpenChange={setModalParcelasOpen}
        contrato={contratoSelecionado}
      />
    </div>
  )
}
