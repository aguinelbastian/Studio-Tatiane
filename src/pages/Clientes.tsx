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
import { Plus, Search } from 'lucide-react'

const mockClientes = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '(11) 98765-4321',
    email: 'maria@email.com',
    status: 'Ativo',
    plan: '2x Semana',
  },
  {
    id: '2',
    name: 'João Pedro',
    phone: '(11) 99999-8888',
    email: 'joao@email.com',
    status: 'Ativo',
    plan: 'Mensal Livre',
  },
  {
    id: '3',
    name: 'Ana Beatriz',
    phone: '(11) 97777-6666',
    email: 'ana@email.com',
    status: 'Inativo',
    plan: 'Avulso',
  },
  {
    id: '4',
    name: 'Roberto Dias',
    phone: '(11) 95555-4444',
    email: 'roberto@email.com',
    status: 'Ativo',
    plan: '1x Semana',
  },
]

export default function Clientes() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Base de alunos e pacientes do estúdio.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Listagem Geral</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar cliente..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Plano Vigente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClientes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.phone}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.plan}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === 'Ativo' ? 'default' : 'secondary'}
                      className={
                        item.status === 'Ativo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Perfil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
