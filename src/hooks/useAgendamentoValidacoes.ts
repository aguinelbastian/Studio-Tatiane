import { supabase } from '@/lib/supabase/client'

export const useAgendamentoValidacoes = () => {
  const podeAgendar = async (cliente_id: string, profissional_id: string, data_hora: string) => {
    try {
      const dataHoraObj = new Date(data_hora)

      // 1. Contrato Ativo
      const { data: contratos } = await supabase
        .from('contratos_cliente')
        .select('*, pacotes(quantidade_sessoes)')
        .eq('cliente_id', cliente_id)
        .eq('status', 'ativo')

      const contratoAtivo = contratos?.find(
        (c: any) => !c.data_fim || new Date(c.data_fim) >= new Date(),
      )
      if (!contratoAtivo) {
        return { valido: false, erro: 'Cliente não possui contrato ativo' }
      }

      // 2. Horário Disponível
      const diaSemana = dataHoraObj.getDay()
      const horaStr = dataHoraObj.toTimeString().substring(0, 5) + ':00'
      const { data: horarios } = await supabase
        .from('horarios_funcionamento')
        .select('*')
        .eq('profissional_id', profissional_id)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true)

      const temHorario = horarios?.some(
        (h: any) => h.hora_inicio <= horaStr && h.hora_fim > horaStr,
      )
      if (!temHorario) {
        return { valido: false, erro: 'Profissional não trabalha neste horário' }
      }

      // 3. Studio Aberto
      const dateStr = data_hora.split('T')[0]
      const { data: fechamentos } = await supabase
        .from('periodos_fechamento')
        .select('*')
        .lte('data_inicio', dateStr)
        .gte('data_fim', dateStr)

      const fechado = fechamentos?.some(
        (f: any) => !f.profissional_id || f.profissional_id === profissional_id,
      )
      if (fechado) {
        return { valido: false, erro: 'Studio fechado ou profissional indisponível neste período' }
      }

      // 4. Sala Ocupada (Pilates Only)
      const { data: prof } = await supabase
        .from('profissionais')
        .select('tipo')
        .eq('id', profissional_id)
        .single()
      if (prof?.tipo === 'pilates') {
        const { data: profOcupado } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('profissional_id', profissional_id)
          .eq('data_hora', data_hora)
          .in('status', ['agendado', 'realizado'])

        if (profOcupado && profOcupado.length > 0) {
          return {
            valido: false,
            erro: 'Profissional já possui agendamento neste horário (conflito)',
          }
        }
      }

      // 5. Pacote Sessões
      if (contratoAtivo.tipo === 'pacote' && contratoAtivo.pacotes) {
        const { data: consumos } = await supabase
          .from('consumo_pacote')
          .select('sessoes_consumidas')
          .eq('contrato_id', contratoAtivo.id)

        const totalConsumido =
          consumos?.reduce((acc: number, curr: any) => acc + (curr.sessoes_consumidas || 0), 0) || 0
        if (totalConsumido >= (contratoAtivo.pacotes as any).quantidade_sessoes) {
          return { valido: false, erro: 'Pacote sem sessões disponíveis' }
        }
      }

      return { valido: true, contrato: contratoAtivo }
    } catch (err: any) {
      return { valido: false, erro: err.message || 'Erro ao validar agendamento' }
    }
  }

  const podeMarcarReposicao = async (
    reposicao_id: string,
    profissional_id: string,
    data_hora: string,
  ) => {
    try {
      const { data: reposicao } = await supabase
        .from('reposicoes')
        .select('*')
        .eq('id', reposicao_id)
        .single()

      if (!reposicao) return { valido: false, erro: 'Reposição não encontrada' }
      if (reposicao.status !== 'pendente')
        return { valido: false, erro: 'Reposição não está mais pendente' }

      if (new Date(reposicao.data_limite + 'T23:59:59') < new Date(data_hora)) {
        return { valido: false, erro: 'Reposição expirou (prazo de 30 dias)' }
      }

      const horarioValid = await podeAgendar(reposicao.cliente_id, profissional_id, data_hora)
      if (!horarioValid.valido) return horarioValid

      return { valido: true }
    } catch (err: any) {
      return { valido: false, erro: err.message || 'Erro ao validar reposição' }
    }
  }

  return { podeAgendar, podeMarcarReposicao }
}
