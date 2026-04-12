import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TabPagamentosAlunos } from '@/components/pagamentos/TabPagamentosAlunos'
import { TabRepasses } from '@/components/pagamentos/TabRepasses'
import { TabAluguel } from '@/components/pagamentos/TabAluguel'
import { usePagamentosData } from '@/hooks/usePagamentosData'
import { Skeleton } from '@/components/ui/skeleton'

export default function Pagamentos() {
  const { pagamentos, repasses, alugueis, clientes, profissionais, loading, refetch } =
    usePagamentosData()

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financeiro e Repasses</h2>
        <p className="text-muted-foreground">
          Gerenciamento de pagamentos, comissões de profissionais e aluguéis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controle Financeiro</CardTitle>
          <CardDescription>
            Acesse as abas abaixo para gerenciar diferentes modalidades de recebimentos e
            pagamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-[400px]" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <Tabs defaultValue="alunos" className="w-full">
              <TabsList className="grid w-full md:w-[600px] grid-cols-3">
                <TabsTrigger value="alunos">Pagamentos</TabsTrigger>
                <TabsTrigger value="repasses">Repasses</TabsTrigger>
                <TabsTrigger value="aluguel">Aluguel</TabsTrigger>
              </TabsList>

              <TabsContent value="alunos">
                <TabPagamentosAlunos
                  pagamentos={pagamentos}
                  clientes={clientes}
                  refetch={refetch}
                />
              </TabsContent>

              <TabsContent value="repasses">
                <TabRepasses repasses={repasses} refetch={refetch} />
              </TabsContent>

              <TabsContent value="aluguel">
                <TabAluguel alugueis={alugueis} profissionais={profissionais} refetch={refetch} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
