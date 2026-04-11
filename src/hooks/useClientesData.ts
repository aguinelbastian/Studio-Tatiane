import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useClientesData() {
  const [clientes, setClientes] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [planos, setPlanos] = useState<any[]>([])
  const [pacotes, setPacotes] = useState<any[]>([])
  const [horarios, setHorarios] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [
        { data: cli, error: e1 },
        { data: con, error: e2 },
        { data: pla, error: e3 },
        { data: pac, error: e4 },
        { data: hor, error: e5 },
        { data: per, error: e6 },
        { data: prof, error: e7 },
      ] = await Promise.all([
        supabase.from('clientes').select('*').order('nome'),
        supabase
          .from('contratos_cliente')
          .select('*, clientes(nome), planos(nome), pacotes(nome)')
          .order('data_inicio', { ascending: false }),
        supabase.from('planos').select('*').order('nome'),
        supabase.from('pacotes').select('*').order('nome'),
        supabase
          .from('horarios_funcionamento')
          .select('*, profissionais(nome)')
          .order('dia_semana'),
        supabase.from('periodos_fechamento').select('*, profissionais(nome)').order('data_inicio'),
        supabase.from('profissionais').select('*').order('nome'),
      ])

      if (e1) throw e1
      if (e2) throw e2

      setClientes(cli || [])
      setContratos(con || [])
      setPlanos(pla || [])
      setPacotes(pac || [])
      setHorarios(hor || [])
      setPeriodos(per || [])
      setProfissionais(prof || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    clientes,
    contratos,
    planos,
    pacotes,
    horarios,
    periodos,
    profissionais,
    loading,
    error,
    refetch: fetchData,
  }
}
