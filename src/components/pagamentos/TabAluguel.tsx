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
import { ModalAluguel } from './ModalAluguel'
import { usePagamentosMutacoes } from '@/hooks/usePagamentosMutacoes'

export function TabAluguel({ alugueis, profissionais, refetch }: any) {
  const [modalOpen, setModalOpen] = useState(false)
  const [aluguelEdicao, setAluguelEdicao] = useState<any>(null)
  const { deletarAluguel } = usePagamentosMutacoes(refetch)

  const handleDeletar = async (id: string) => {
    if (confirm('Excluir este registro?')) {
      await deletarAluguel(id)
    }
  }

  const profsAluguel = profissionais.filter((p: any) => p.tipo !== 'pilates')

  return (
    <div className="space-y-4 mt-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Pagamentos de Aluguel de Espaço</h3>
        <Button
          onClick={() => {
            setAluguelEdicao(null)
            setModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Aluguel
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alugueis.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.profissionais?.nome}</TableCell>
                <TableCell>{new Date(a.data_pagamento).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>R$ {a.valor.toFixed(2)}</TableCell>
                <TableCell className="uppercase">{a.metodo_pagamento}</TableCell>
                <TableCell>
                  <Badge
                    variant={a.status === 'pago' ? 'default' : 'secondary'}
                    className={a.status === 'pago' ? 'bg-green-600' : ''}
                  >
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAluguelEdicao(a)
                      setModalOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeletar(a.id)}>
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {alugueis.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Nenhum pagamento de aluguel registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ModalAluguel
        open={modalOpen}
        onOpenChange={setModalOpen}
        aluguel={aluguelEdicao}
        profissionais={profsAluguel}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
