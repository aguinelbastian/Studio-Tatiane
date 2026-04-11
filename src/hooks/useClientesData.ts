import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export const useClientesData = () => {
  const [clientes, setClientes] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [planos, setPlanos] = useState<any[]>([])
  const [pacotes, setPacotes] = useState<any[]>([])
  const [horarios, setHorarios] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        { data: clientesData, error: clientesError },
        { data: contratosData, error: contratosError },
        { data: planosData, error: planosError },
        { data: pacotesData, error: pacotesError },
        { data: horariosData, error: horariosError },
        { data: periodosData, error: periodosError },
      ] = await Promise.all([
        supabase
          .from('clientes')
          .select('*')
          .eq('status', 'ativo')
          .order('nome', { ascending: true })
          .limit(500),
        supabase
          .from('contratos_cliente')
          .select('*')
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false })
          .limit(500),
        supabase
          .from('planos')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true })
          .limit(100),
        supabase
          .from('pacotes')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true })
          .limit(100),
        supabase
          .from('horarios_funcionamento')
          .select('*')
          .eq('ativo', true)
          .order('dia_semana', { ascending: true })
          .limit(100),
        supabase
          .from('periodos_fechamento')
          .select('*')
          .gte('data_fim', new Date().toISOString().split('T')[0])
          .order('data_inicio', { ascending: true })
          .limit(100),
      ])

      if (clientesError) throw clientesError
      if (contratosError) throw contratosError
      if (planosError) throw planosError
      if (pacotesError) throw pacotesError
      if (horariosError) throw horariosError
      if (periodosError) throw periodosError

      setClientes(clientesData || [])
      setContratos(contratosData || [])
      setPlanos(planosData || [])
      setPacotes(pacotesData || [])
      setHorarios(horariosData || [])
      setPeriodos(periodosData || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
      console.error('Erro em useClientesData:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchData])

  return {
    clientes,
    contratos,
    planos,
    pacotes,
    horarios,
    periodos,
    loading,
    error,
    refetch: fetchData,
  }
}
