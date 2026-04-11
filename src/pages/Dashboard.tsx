import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import useAuthStore from '@/stores/useAuthStore'
import { KPICards } from '@/components/dashboard/KPICards'
import { ReceitaProfissionalChart } from '@/components/dashboard/ReceitaProfissionalChart'
import { OcupacaoHorarioChart } from '@/components/dashboard/OcupacaoHorarioChart'
import { UltimasTransacoes } from '@/components/dashboard/UltimasTransacoes'
import { AlertasOperacionais } from '@/components/dashboard/AlertasOperacionais'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = useDashboardData()
  const { toast } = useToast()

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px]" />
          <Skeleton className="col-span-3 h-[400px]" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Olá, {user?.name?.split(' ')[0]}</h2>
          <p className="text-muted-foreground">Visão geral do studio em tempo real.</p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm" className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <KPICards kpis={data.kpis} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <ReceitaProfissionalChart receitas={data.receitas} />
        </div>
        <div className="col-span-3">
          <OcupacaoHorarioChart agendamentos={data.agendamentosMes} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <UltimasTransacoes transacoes={data.transacoes} />
        </div>
        <div className="col-span-3">
          <AlertasOperacionais alertas={data.alertas} />
        </div>
      </div>
    </div>
  )
}
