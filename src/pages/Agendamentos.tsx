import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Plus } from 'lucide-react'

const mockAgendamentos = [
  {
    id: '1',
    date: 'Hoje, 08:00',
    client: 'Maria Silva',
    prof: 'Tatiane K.',
    type: 'Pilates Aparelho',
    status: 'Realizado',
  },
  {
    id: '2',
    date: 'Hoje, 14:00',
    client: 'João Pedro',
    prof: 'Carlos Instrutor',
    type: 'Pilates Solo',
    status: 'Agendado',
  },
  {
    id: '3',
    date: 'Amanhã, 09:30',
    client: 'Ana Beatriz',
    prof: 'Tatiane K.',
    type: 'Massoterapia',
    status: 'Agendado',
  },
  {
    id: '4',
    date: 'Amanhã, 16:00',
    client: 'Roberto Dias',
    prof: 'Carlos Instrutor',
    type: 'Pilates Aparelho',
    status: 'Cancelado',
  },
]

export default function Agendamentos() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agendamentos</h2>
          <p className="text-muted-foreground">Gerencie a agenda de sessões do estúdio.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos Dias</CardTitle>
          <CardDescription>Lista dos últimos e próximos agendamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAgendamentos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.date}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{item.prof}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'Realizado'
                          ? 'default'
                          : item.status === 'Agendado'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                    >
                      Editar
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
