import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRelatoriosExportacao } from '@/hooks/useRelatoriosExportacao'
import { useState } from 'react'

interface TabelaRelatorioProps {
  colunas: string[]
  dados: any[]
  renderRow: (row: any, index: number) => React.ReactNode
  nomeExportacao?: string
  itemsPorPagina?: number
}

export function TabelaRelatorio({
  colunas,
  dados,
  renderRow,
  nomeExportacao = 'relatorio',
  itemsPorPagina = 10,
}: TabelaRelatorioProps) {
  const { exportarCSV } = useRelatoriosExportacao()
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.ceil(dados.length / itemsPorPagina) || 1
  const dadosPaginados = dados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina)

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={() => exportarCSV(dados, nomeExportacao)}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((col, i) => (
                <TableHead key={i}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colunas.length} className="text-center py-4">
                  Nenhum dado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              dadosPaginados.map((row, i) => renderRow(row, i))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end space-x-2 print:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
