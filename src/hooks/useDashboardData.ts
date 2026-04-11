import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, addDays, formatISO } from 'date-fns'

export interface DashboardData {
  kpis: {
    clientesAtivos: number
    receitaMes: number
    taxaOcupacaoGeral: number
    aulasRealizadas: number
  }
  receitas: any[]
  agendamentosMes: any[]
  transacoes: {
    pagamentos: any[]
    agendamentos: any[]
    reposicoes: any[]
  }
  alertas: {
    reposicoesPendentes: number
    pagamentosVencidos: number
    contratosAVencer: number
  }
}

export function useDashboardData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const startStr = formatISO(startOfMonth(now))
      const endStr = formatISO(endOfMonth(now))
      const nowStr = formatISO(now)
      const in7DaysStr = formatISO(addDays(now, 7))

      // 1. Clientes Ativos
      const { count: clientesAtivos } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')

      // 2. Receita do Mês
      const { data: contratosMes } = await supabase
        .from('contratos_cliente')
        .select('preco_pago')
        .gte('data_inicio', startStr)
        .lte('data_inicio', endStr)
      const receitaMes =
        contratosMes?.reduce((acc, curr) => acc + Number(curr.preco_pago || 0), 0) || 0

      // 3. Taxa de Ocupação Geral
      const { data: ocupacaoGeralData } = await supabase
        .from('vw_ocupacao_profissional')
        .select('taxa_ocupacao_percentual')
      const taxaOcupacaoGeral = ocupacaoGeralData?.length
        ? ocupacaoGeralData.reduce(
            (acc, curr) => acc + Number(curr.taxa_ocupacao_percentual || 0),
            0,
          ) / ocupacaoGeralData.length
        : 0

      // 4. Aulas Realizadas (Mês)
      const { count: aulasRealizadas } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'realizado')
        .gte('data_hora', startStr)
        .lte('data_hora', endStr)

      // Gráficos - Receita
      const { data: receitas } = await supabase.from('vw_receitas_profissional').select('*')

      // Gráficos - Ocupação por horário
      const { data: agendamentosMes } = await supabase
        .from('agendamentos')
        .select('data_hora, status')
        .gte('data_hora', startStr)
        .lte('data_hora', endStr)

      // Transações
      const { data: pagamentos } = await supabase
        .from('pagamentos')
        .select('id, data_pagamento, valor, metodo, status, contratos_cliente(clientes(nome))')
        .order('data_criacao', { ascending: false })
        .limit(10)

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('id, data_hora, status, tipo, clientes(nome), profissionais(nome)')
        .order('data_criacao', { ascending: false })
        .limit(10)

      const { data: reposicoes } = await supabase
        .from('reposicoes')
        .select('id, data_limite, status, clientes(nome)')
        .order('data_criacao', { ascending: false })
        .limit(10)

      // Alertas
      const { count: reposicoesPendentes } = await supabase
        .from('reposicoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')

      const { count: pagamentosVencidos } = await supabase
        .from('pagamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .lt('data_pagamento', nowStr)

      const { count: contratosAVencer } = await supabase
        .from('contratos_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
        .gte('data_fim', nowStr)
        .lte('data_fim', in7DaysStr)

      setData({
        kpis: {
          clientesAtivos: clientesAtivos || 0,
          receitaMes,
          taxaOcupacaoGeral,
          aulasRealizadas: aulasRealizadas || 0,
        },
        receitas: receitas || [],
        agendamentosMes: agendamentosMes || [],
        transacoes: {
          pagamentos: pagamentos || [],
          agendamentos: agendamentos || [],
          reposicoes: reposicoes || [],
        },
        alertas: {
          reposicoesPendentes: reposicoesPendentes || 0,
          pagamentosVencidos: pagamentosVencidos || 0,
          contratosAVencer: contratosAVencer || 0,
        },
      })
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
