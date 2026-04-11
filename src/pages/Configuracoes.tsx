import { useClientesData } from '@/hooks/useClientesData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AbaPlanos } from '@/components/configuracoes/AbaPlanos'
import { AbaPacotes } from '@/components/configuracoes/AbaPacotes'
import { AbaHorarios } from '@/components/configuracoes/AbaHorarios'
import { AbaPeriodos } from '@/components/configuracoes/AbaPeriodos'
import { Skeleton } from '@/components/ui/skeleton'

export default function Configuracoes() {
  const { planos, pacotes, horarios, periodos, profissionais, loading, refetch } = useClientesData()

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Ajustes gerais do sistema (Acesso restrito ao Admin).
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="planos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="periodos">Fechamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="planos">
            <AbaPlanos planos={planos} refetch={refetch} />
          </TabsContent>

          <TabsContent value="pacotes">
            <AbaPacotes pacotes={pacotes} refetch={refetch} />
          </TabsContent>

          <TabsContent value="horarios">
            <AbaHorarios horarios={horarios} profissionais={profissionais} refetch={refetch} />
          </TabsContent>

          <TabsContent value="periodos">
            <AbaPeriodos periodos={periodos} profissionais={profissionais} refetch={refetch} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
