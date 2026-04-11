import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRelatoriosData } from '@/hooks/useRelatoriosData'
import { TabReceitas } from '@/components/relatorios/TabReceitas'
import { TabOcupacao } from '@/components/relatorios/TabOcupacao'
import { TabComportamento } from '@/components/relatorios/TabComportamento'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useRelatoriosExportacao } from '@/hooks/useRelatoriosExportacao'

export default function Relatorios() {
  const { receitas, ocupacao, comportamento, loading } = useRelatoriosData()
  const { exportarPDF } = useRelatoriosExportacao()

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-full max-w-sm" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10" id="relatorio-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios Operacionais</h2>
          <p className="text-muted-foreground">
            Visão analítica de receitas, ocupação e comportamento de alunos.
          </p>
        </div>
        <Button variant="outline" className="print:hidden w-fit" onClick={exportarPDF}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>

      <Tabs defaultValue="receitas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 print:hidden">
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="ocupacao">Ocupação</TabsTrigger>
          <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
        </TabsList>

        {/* On print, show active tab only, or we can use print styles to handle visibility if needed.
            TabsContent already manages visibility perfectly for screen and print */}
        <TabsContent value="receitas" className="print:block mt-0 border-none p-0">
          <TabReceitas dados={receitas} />
        </TabsContent>

        <TabsContent value="ocupacao" className="print:block mt-0 border-none p-0">
          <TabOcupacao dados={ocupacao} />
        </TabsContent>

        <TabsContent value="comportamento" className="print:block mt-0 border-none p-0">
          <TabComportamento dados={comportamento} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
