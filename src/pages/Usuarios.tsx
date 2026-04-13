import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { Loader2, Edit2, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ModalUsuario from '@/components/usuarios/ModalUsuario'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const { toast } = useToast()

  const fetchUsuarios = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setModalOpen(true)
  }

  const handleNew = () => {
    setSelectedUser(null)
    setModalOpen(true)
  }

  const handleDelete = async (user: any) => {
    if (confirm(`Tem certeza que deseja deletar o usuário ${user.nome}?`)) {
      const { error } = await supabase.rpc('delete_user', { p_user_id: user.id })
      if (error) {
        toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Usuário deletado com sucesso' })
        fetchUsuarios()
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h2>
          <p className="text-muted-foreground">Gerencie o acesso e permissões do sistema.</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id} className="group transition-colors">
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(u)}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(u)}
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive transition-colors" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {modalOpen && (
        <ModalUsuario
          open={modalOpen}
          onOpenChange={setModalOpen}
          usuario={selectedUser}
          onSuccess={fetchUsuarios}
        />
      )}
    </div>
  )
}
