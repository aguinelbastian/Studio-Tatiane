import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash } from 'lucide-react'
import { ModalPagamentoAluno } from './ModalPagamentoAluno'
import { usePagamentosMutacoes } from '@/hooks/usePagamentosMutacoes'

export function TabPagamentosAlunos({ pagamentos, clientes, refetch }: any) {
  const [modalOpen, setModalOpen] = useState(false)
  const [pagamentoEdicao, setPagamentoEdicao] = useState<any>(null)
  const { deletarPagamentoAluno } = usePagamentosMutacoes(refetch)

  const handleDeletar = async (id: string) => {
    if (confirm('Excluir este pagamento?')) {
      await deletarPagamentoAluno(id)
    }
  }

  return (
    <div className="space-y-4 mt-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Pagamentos Registrados</h3>
        <Button
          onClick={() => {
            setPagamentoEdicao(null)
            setModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Pagamento
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.clientes?.nome || 'N/A'}</TableCell>
                <TableCell>{new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>R$ {p.valor.toFixed(2)}</TableCell>
                <TableCell className="uppercase">{p.metodo}</TableCell>
                <TableCell className="capitalize">
                  {p.tipo_pagamento?.replace('_', ' ') || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === 'confirmado'
                        ? 'default'
                        : p.status === 'cancelado'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={p.status === 'confirmado' ? 'bg-green-600' : ''}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPagamentoEdicao(p)
                      setModalOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeletar(p.id)}>
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pagamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Nenhum pagamento registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ModalPagamentoAluno
        open={modalOpen}
        onOpenChange={setModalOpen}
        pagamento={pagamentoEdicao}
        clientes={clientes}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
