import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
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
import { UserPlus, Edit, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ModalProfissional } from '@/components/profissionais/ModalProfissional'

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any>(null)

  const fetchDados = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profissionais').select('*').order('nome')
    if (error) {
      toast.error('Erro ao carregar profissionais')
    } else {
      setProfissionais(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [])

  const handleEdit = (prof: any) => {
    setProfissionalSelecionado(prof)
    setModalOpen(true)
  }

  const handleDelete = async (prof: any) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', prof.id)
      .gte('data_hora', new Date().toISOString())

    if (error) {
      toast.error('Erro ao verificar agendamentos')
      return
    }

    if (data && data.length > 0) {
      toast.error('Não é possível deletar profissional com agendamentos futuros.')
      return
    }

    if (
      confirm(
        'Tem certeza que deseja deletar este profissional? Se houver agendamentos associados, eles não serão deletados.',
      )
    ) {
      const { error: delErr } = await supabase.from('profissionais').delete().eq('id', prof.id)
      if (delErr) {
        toast.error(delErr.message)
      } else {
        toast.success('Profissional deletado com sucesso')
        fetchDados()
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profissionais</h2>
          <p className="text-muted-foreground">Gerencie a equipe do estúdio.</p>
        </div>
        <Button
          onClick={() => {
            setProfissionalSelecionado(null)
            setModalOpen(true)
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Novo Profissional
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Aluguel Fixo</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profissionais.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="capitalize">{item.tipo}</TableCell>
                    <TableCell>{item.comissao_percentual}%</TableCell>
                    <TableCell>
                      {item.aluguel_fixo_mensal ? `R$ ${item.aluguel_fixo_mensal}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: item.cor_calendario || '#ccc' }}
                      ></div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {profissionais.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhum profissional encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalProfissional
        open={modalOpen}
        onOpenChange={setModalOpen}
        profissional={profissionalSelecionado}
        onSuccess={() => {
          setModalOpen(false)
          fetchDados()
        }}
      />
    </div>
  )
}
