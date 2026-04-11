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
import { Edit, Trash2 } from 'lucide-react'
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'
import { ModalPeriodo } from '@/components/configuracoes/ModalPeriodo'

export function AbaPeriodos({ periodos, profissionais, refetch }: any) {
  const { deletarPeriodoFechamento } = useClientesMutacoes(refetch)
  const [modalOpen, setModalOpen] = useState(false)
  const [periodoEdicao, setPeriodoEdicao] = useState<any>(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Períodos de Fechamento</CardTitle>
          <CardDescription>Cadastre férias, feriados ou manutenções.</CardDescription>
        </div>
        <Button
          onClick={() => {
            setPeriodoEdicao(null)
            setModalOpen(true)
          }}
        >
          Novo Período
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{new Date(p.data_fim).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="capitalize">{p.motivo}</TableCell>
                <TableCell>
                  {p.profissional_id ? p.profissionais?.nome : 'Studio Inteiro'}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPeriodoEdicao(p)
                      setModalOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Deletar?')) deletarPeriodoFechamento(p.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <ModalPeriodo
        open={modalOpen}
        onOpenChange={setModalOpen}
        periodo={periodoEdicao}
        profissionais={profissionais}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </Card>
  )
}
