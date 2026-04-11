import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useRelatoriosData() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [ocupacao, setOcupacao] = useState<any[]>([])
  const [comportamento, setComportamento] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [resReceitas, resOcupacao, resComportamento] = await Promise.all([
        supabase.from('vw_receitas_profissional').select('*').limit(500),
        supabase.from('vw_ocupacao_profissional').select('*').limit(500),
        supabase.from('vw_comportamento_alunos').select('*').limit(1000),
      ])

      if (resReceitas.error) throw resReceitas.error
      if (resOcupacao.error) throw resOcupacao.error
      if (resComportamento.error) throw resComportamento.error

      setReceitas(resReceitas.data || [])
      setOcupacao(resOcupacao.data || [])
      setComportamento(resComportamento.data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar dados dos relatórios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { receitas, ocupacao, comportamento, loading, refetch: fetchData }
}
