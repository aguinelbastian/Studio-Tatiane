import { supabase } from '@/lib/supabase/client'

export const usePagamentosMutacoes = (onSuccess?: () => void) => {
  const salvarPagamentoAluno = async (data: any) => {
    try {
      if (data.id) {
        await supabase.from('pagamentos').update(data).eq('id', data.id)
      } else {
        await supabase.from('pagamentos').insert(data)
      }
      onSuccess?.()
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  const deletarPagamentoAluno = async (id: string) => {
    try {
      await supabase.from('pagamentos').delete().eq('id', id)
      onSuccess?.()
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  const marcarRepassePago = async (id: string) => {
    try {
      await supabase
        .from('repasses_profissionais')
        .update({ status_pagamento: 'pago' })
        .eq('id', id)
      onSuccess?.()
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  const salvarAluguel = async (data: any) => {
    try {
      if (data.id) {
        await supabase.from('pagamentos_aluguel').update(data).eq('id', data.id)
      } else {
        await supabase.from('pagamentos_aluguel').insert(data)
      }
      onSuccess?.()
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  const deletarAluguel = async (id: string) => {
    try {
      await supabase.from('pagamentos_aluguel').delete().eq('id', id)
      onSuccess?.()
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  return {
    salvarPagamentoAluno,
    deletarPagamentoAluno,
    marcarRepassePago,
    salvarAluguel,
    deletarAluguel,
  }
}
