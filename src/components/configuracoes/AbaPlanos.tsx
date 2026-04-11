import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ModalPlano } from '@/components/configuracoes/ModalPlano'
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'
import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function AbaPlanos({ planos, refetch }: any) {
  const { desativarPlano } = useClientesMutacoes(refetch)
  const [modalOpen, setModalOpen] = useState(false)
  const [planoEdicao, setPlanoEdicao] = useState<any>(null)

  const handleEdit = (plano: any) => {
    setPlanoEdicao(plano)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Desativar este plano?')) {
      await desativarPlano(id)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Planos</CardTitle>
          <CardDescription>
            Cadastre ou edite as opções de planos mensais/trimestrais.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setPlanoEdicao(null)
            setModalOpen(true)
          }}
        >
          Novo Plano
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Duração (dias)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.nome}</TableCell>
                <TableCell>{p.frequencia}x</TableCell>
                <TableCell>R$ {p.preco}</TableCell>
                <TableCell>{p.duracao_dias}</TableCell>
                <TableCell>
                  <Badge variant={p.ativo ? 'default' : 'secondary'}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {p.ativo && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <ModalPlano
        open={modalOpen}
        onOpenChange={setModalOpen}
        plano={planoEdicao}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </Card>
  )
}
