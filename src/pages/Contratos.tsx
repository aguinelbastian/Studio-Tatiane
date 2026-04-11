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
import { FilePlus } from 'lucide-react'

const mockContratos = [
  {
    id: '101',
    client: 'Maria Silva',
    plan: 'Pilates 2x Semana',
    start: '01/03/2026',
    end: '01/09/2026',
    status: 'Ativo',
  },
  {
    id: '102',
    client: 'João Pedro',
    plan: 'Massoterapia Mensal',
    start: '15/04/2026',
    end: '15/10/2026',
    status: 'Ativo',
  },
  {
    id: '103',
    client: 'Ana Beatriz',
    plan: 'Pilates 1x Semana',
    start: '10/01/2025',
    end: '10/01/2026',
    status: 'Concluído',
  },
  {
    id: '104',
    client: 'Roberto Dias',
    plan: 'Pilates 2x Semana',
    start: '20/02/2026',
    end: '20/08/2026',
    status: 'Cancelado',
  },
]

export default function Contratos() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">Gerenciamento de planos e pacotes dos clientes.</p>
        </div>
        <Button>
          <FilePlus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos Ativos e Histórico</CardTitle>
          <CardDescription>Acompanhe o período de vigência dos planos contratados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato #</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano/Pacote</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContratos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.client}</TableCell>
                  <TableCell>{item.plan}</TableCell>
                  <TableCell>{item.start}</TableCell>
                  <TableCell>{item.end}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'Ativo'
                          ? 'default'
                          : item.status === 'Concluído'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Ver
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
