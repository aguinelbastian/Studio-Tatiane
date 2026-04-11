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
import { ModalPacote } from '@/components/configuracoes/ModalPacote'
import { useClientesMutacoes } from '@/hooks/useClientesMutacoes'
import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function AbaPacotes({ pacotes, refetch }: any) {
  const { desativarPacote } = useClientesMutacoes(refetch)
  const [modalOpen, setModalOpen] = useState(false)
  const [pacoteEdicao, setPacoteEdicao] = useState<any>(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pacotes</CardTitle>
          <CardDescription>Cadastre ou edite pacotes de sessões fechadas.</CardDescription>
        </div>
        <Button
          onClick={() => {
            setPacoteEdicao(null)
            setModalOpen(true)
          }}
        >
          Novo Pacote
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Sessões</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Validade (dias)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacotes.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.nome}</TableCell>
                <TableCell className="capitalize">{p.tipo}</TableCell>
                <TableCell>{p.quantidade_sessoes}</TableCell>
                <TableCell>R$ {p.preco}</TableCell>
                <TableCell>{p.validade_dias}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPacoteEdicao(p)
                      setModalOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {p.ativo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Desativar?')) desativarPacote(p.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <ModalPacote
        open={modalOpen}
        onOpenChange={setModalOpen}
        pacote={pacoteEdicao}
        onSuccess={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </Card>
  )
}
