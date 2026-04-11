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
import { Edit } from 'lucide-react'
import { ModalHorario } from '@/components/configuracoes/ModalHorario'

export function AbaHorarios({ horarios, profissionais, refetch }: any) {
  const [modalOpen, setModalOpen] = useState(false)
  const [horarioEdicao, setHorarioEdicao] = useState<any>(null)

  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Horários de Funcionamento</CardTitle>
          <CardDescription>Configure os turnos por profissional e dia da semana.</CardDescription>
        </div>
        <Button
          onClick={() => {
            setHorarioEdicao(null)
            setModalOpen(true)
          }}
        >
          Novo Horário
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horarios.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>{diasSemana[h.dia_semana]}</TableCell>
                <TableCell>{h.profissionais?.nome}</TableCell>
                <TableCell>{h.hora_inicio}</TableCell>
                <TableCell>{h.hora_fim}</TableCell>
                <TableCell>{h.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setHorarioEdicao(h)
                      setModalOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <ModalHorario
        open={modalOpen}
        onOpenChange={setModalOpen}
        horario={horarioEdicao}
        profissionais={profissionais}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </Card>
  )
}
