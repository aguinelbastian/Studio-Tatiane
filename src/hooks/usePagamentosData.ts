import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export const usePagamentosData = () => {
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [repasses, setRepasses] = useState<any[]>([])
  const [alugueis, setAlugueis] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: dPagamentos },
        { data: dRepasses },
        { data: dAlugueis },
        { data: dClientes },
        { data: dProfissionais },
      ] = await Promise.all([
        supabase
          .from('pagamentos')
          .select('*, clientes(nome), contratos_cliente(tipo)')
          .order('data_pagamento', { ascending: false }),
        supabase
          .from('repasses_profissionais')
          .select('*, profissionais(nome), agendamentos(data_hora, clientes(nome))')
          .order('data_aula', { ascending: false }),
        supabase
          .from('pagamentos_aluguel')
          .select('*, profissionais(nome)')
          .order('data_pagamento', { ascending: false }),
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('profissionais').select('id, nome, tipo').order('nome'),
      ])

      setPagamentos(dPagamentos || [])
      setRepasses(dRepasses || [])
      setAlugueis(dAlugueis || [])
      setClientes(dClientes || [])
      setProfissionais(dProfissionais || [])
    } catch (error) {
      console.error('Error fetching pagamentos data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { pagamentos, repasses, alugueis, clientes, profissionais, loading, refetch: fetchData }
}
