import { useCallback } from 'react'
import { toast } from 'sonner'

export function useRelatoriosExportacao() {
  const exportarCSV = useCallback((dados: any[], nomeArquivo: string) => {
    if (!dados || !dados.length) {
      toast.warning('Sem dados para exportar')
      return
    }
    try {
      const headers = Object.keys(dados[0]).join(',')
      const rows = dados
        .map((row) =>
          Object.values(row)
            .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\n')

      const csv = `${headers}\n${rows}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${nomeArquivo}.csv`
      link.click()
      toast.success('CSV exportado com sucesso')
    } catch (error) {
      toast.error('Erro ao exportar arquivo CSV')
    }
  }, [])

  const exportarPDF = useCallback(() => {
    window.print()
    toast.success('Preparando documento para impressão/PDF')
  }, [])

  return { exportarCSV, exportarPDF }
}
