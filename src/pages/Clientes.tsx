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
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ModalCliente } from '@/components/clientes/ModalCliente'

export default function Clientes() {
  const { clientes, loading, refetch } = useClientesData()
  const { deletarCliente } = useClientesMutacoes(refetch)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteEdicao, setClienteEdicao] = useState<any>(null)

  const clientesFiltrados = clientes.filter(
    (c: any) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(busca.toLowerCase())) ||
      (c.cpf && c.cpf.includes(busca.replace(/\D/g, ''))),
  )

  const handleEdit = (cliente: any) => {
    setClienteEdicao(cliente)
    setModalOpen(true)
  }

  const handleNew = () => {
    setClienteEdicao(null)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar este cliente?')) {
      await deletarCliente(id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Gestão completa de alunos e pacientes.</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Listagem de Clientes</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou email..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.telefone}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>
                      {item.cpf
                        ? item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        : '-'}
                    </TableCell>
                    <TableCell>{new Date(item.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 'ativo' ? 'default' : 'secondary'}
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
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {clientesFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalCliente
        open={modalOpen}
        onOpenChange={setModalOpen}
        cliente={clienteEdicao}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
