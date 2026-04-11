import { useState } from 'react'
import { useClientesData } from '@/hooks/useClientesData'
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
import { FilePlus, Edit, Pause, XCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ModalContrato } from '@/components/contratos/ModalContrato'

export default function Contratos() {
  const { contratos, clientes, planos, pacotes, loading, refetch } = useClientesData()
  const { pausarContrato, cancelarContrato } = useClientesMutacoes(refetch)
  const [modalOpen, setModalOpen] = useState(false)
  const [contratoEdicao, setContratoEdicao] = useState<any>(null)

  const handleNew = () => {
    setContratoEdicao(null)
    setModalOpen(true)
  }

  const handleEdit = (contrato: any) => {
    setContratoEdicao(contrato)
    setModalOpen(true)
  }

  const handlePause = async (id: string) => {
    if (confirm('Pausar este contrato?')) {
      await pausarContrato(id)
    }
  }

  const handleCancel = async (contrato: any) => {
    const dataInicio = new Date(contrato.data_inicio).getTime()
    const dataFim = contrato.data_fim ? new Date(contrato.data_fim).getTime() : new Date().getTime()
    const dias = (dataFim - dataInicio) / (1000 * 60 * 60 * 24)
    const valorMensal = contrato.preco_pago / (dias / 30 || 1)
    const reembolso = Math.max(0, contrato.preco_pago - valorMensal)

    if (confirm(`Cancelar contrato? Reembolso estimado: R$ ${reembolso.toFixed(2)}`)) {
      await cancelarContrato(contrato.id, reembolso)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">Gerenciamento de planos e pacotes dos clientes.</p>
        </div>
        <Button onClick={handleNew}>
          <FilePlus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos Ativos e Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano/Pacote</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Preço Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.clientes?.nome}</TableCell>
                    <TableCell>
                      {item.tipo === 'plano' ? item.planos?.nome : item.pacotes?.nome}
                    </TableCell>
                    <TableCell>{new Date(item.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {item.data_fim ? new Date(item.data_fim).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>R$ {item.preco_pago.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'ativo'
                            ? 'default'
                            : item.status === 'pausado'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className={
                          item.status === 'ativo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {item.status === 'ativo' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handlePause(item.id)}>
                            <Pause className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCancel(item)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {contratos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Nenhum contrato encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalContrato
        open={modalOpen}
        onOpenChange={setModalOpen}
        contrato={contratoEdicao}
        clientes={clientes}
        planos={planos}
        pacotes={pacotes}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
