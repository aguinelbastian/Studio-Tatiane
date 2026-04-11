import { supabase } from '@/lib/supabase/client'

export const useAgendamentoMutacoes = () => {
  const criarAgendamento = async (
    cliente_id: string,
    profissional_id: string,
    data_hora: string,
    tipo: string,
    contrato_id?: string,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agendamento', {
        body: { acao: 'criar', cliente_id, profissional_id, data_hora, tipo, contrato_id },
      })
      if (error) throw error
      if (!data?.sucesso) throw new Error(data?.erro || 'Erro desconhecido')
      return { sucesso: true, id: data.agendamento_id }
    } catch (err: any) {
      console.warn('Edge function failed, running local fallback', err)
      try {
        const { data, error } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id,
            profissional_id,
            data_hora,
            tipo,
            status: 'agendado',
          })
          .select()
          .single()
        if (error) throw error

        if (contrato_id) {
          const { data: contrato } = await supabase
            .from('contratos_cliente')
            .select('tipo')
            .eq('id', contrato_id)
            .single()
          if (contrato?.tipo === 'pacote') {
            await supabase.from('consumo_pacote').insert({
              contrato_id,
              agendamento_id: data.id,
              sessoes_consumidas: 1,
            })
          }
        }
        return { sucesso: true, id: data.id }
      } catch (fallbackErr: any) {
        return { sucesso: false, erro: fallbackErr.message }
      }
    }
  }

  const cancelarAgendamento = async (agendamento_id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agendamento', {
        body: { acao: 'cancelar', agendamento_id },
      })
      if (error) throw error
      if (!data?.sucesso) throw new Error(data?.erro || 'Erro desconhecido')
      return { sucesso: true, com_reposicao: data.com_reposicao }
    } catch (err: any) {
      console.warn('Edge function failed, running local fallback', err)
      try {
        const { data: agendamento, error: getErr } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamento_id)
          .single()
        if (getErr) throw getErr

        const { error: updErr } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', agendamento_id)
        if (updErr) throw updErr

        const isComAntecedencia =
          new Date(agendamento.data_hora).getTime() - new Date().getTime() > 6 * 60 * 60 * 1000
        if (isComAntecedencia) {
          const dataLimite = new Date()
          dataLimite.setDate(dataLimite.getDate() + 30)
          await supabase.from('reposicoes').insert({
            agendamento_original_id: agendamento.id,
            cliente_id: agendamento.cliente_id,
            profissional_id: agendamento.profissional_id,
            data_limite: dataLimite.toISOString().split('T')[0],
            status: 'pendente',
          })
        }
        return { sucesso: true, com_reposicao: isComAntecedencia }
      } catch (fallbackErr: any) {
        return { sucesso: false, erro: fallbackErr.message }
      }
    }
  }

  const marcarReposicao = async (
    reposicao_id: string,
    profissional_id: string,
    data_hora: string,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agendamento', {
        body: { acao: 'marcar_reposicao', reposicao_id, profissional_id, data_hora },
      })
      if (error) throw error
      if (!data?.sucesso) throw new Error(data?.erro)
      return { sucesso: true }
    } catch (err: any) {
      console.warn('Edge function failed, running local fallback', err)
      try {
        const { data: reposicao } = await supabase
          .from('reposicoes')
          .select('*')
          .eq('id', reposicao_id)
          .single()
        if (!reposicao) throw new Error('Reposicao não encontrada')

        const { data: novoAgendamento, error: insErr } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id: reposicao.cliente_id,
            profissional_id,
            data_hora,
            tipo: 'reposicao',
            status: 'agendado',
          })
          .select()
          .single()
        if (insErr) throw insErr

        await supabase
          .from('reposicoes')
          .update({
            status: 'marcada',
            agendamento_reposicao_id: novoAgendamento.id,
            data_marcacao: new Date().toISOString(),
          })
          .eq('id', reposicao_id)

        return { sucesso: true }
      } catch (fallbackErr: any) {
        return { sucesso: false, erro: fallbackErr.message }
      }
    }
  }

  const marcarRealizado = async (agendamento_id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'realizado' })
        .eq('id', agendamento_id)
      if (error) throw error
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  const deletarAgendamento = async (agendamento_id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamento_id)
      if (error) throw error
      return { sucesso: true }
    } catch (err: any) {
      return { sucesso: false, erro: err.message }
    }
  }

  return {
    criarAgendamento,
    cancelarAgendamento,
    marcarReposicao,
    marcarRealizado,
    deletarAgendamento,
  }
}
