import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Leaf, Loader2 } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { setUser, user } = useAuthStore()

  // Se já está logado, redireciona
  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha e-mail e senha.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Validar contra tabela usuarios (autenticação customizada)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, role, status')
        .eq('email', email)
        .eq('status', 'ativo')
        .single()

      if (error || !data) {
        toast({
          title: 'Erro de autenticação',
          description: 'E-mail ou senha inválidos.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      // Validação simples de senha (em produção, usar bcrypt no backend)
      // Por enquanto, aceita qualquer senha para usuários válidos
      if (password !== 'senha123') {
        toast({
          title: 'Erro de autenticação',
          description: 'E-mail ou senha inválidos.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      // Autenticação bem-sucedida
      setUser({
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
      })

      toast({
        title: 'Bem-vindo(a)!',
        description: `Login realizado com sucesso. Bem-vindo, ${data.nome}!`,
      })

      // Redirecionar para dashboard
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast({
        title: 'Erro ao conectar',
        description: err.message || 'Erro desconhecido ao tentar fazer login.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <img
          src="https://img.usecurling.com/p/1920/1080?q=pilates%20studio&color=gray"
          alt="Pilates Studio Background"
          className="w-full h-full object-cover"
        />
      </div>
      <Card className="w-full max-w-md z-10 shadow-elevation border-border/50 animate-fade-in-up">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Studio Tatiane Kafka Ghizoni
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesse o sistema de gerenciamento
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="transition-all focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="transition-all focus-visible:ring-primary"
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground mt-4">
              <p className="font-medium mb-1">Credenciais de Teste:</p>
              <p>Tatiane: tatiane@studio.com / senha123</p>
              <p>Renata: renata@studio.com / senha123</p>
              <p>Miriam: miriam@studio.com / senha123</p>
              <p>Aguinel: aguinel@studio.com / senha123</p>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full h-11 transition-all" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
