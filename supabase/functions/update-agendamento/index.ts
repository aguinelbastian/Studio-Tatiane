import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const body = await req.json()
    const {
      acao,
      cliente_id,
      profissional_id,
      data_hora,
      tipo,
      contrato_id,
      agendamento_id,
      reposicao_id,
    } = body

    // ============================================
    // AÇÃO 1: CRIAR AGENDAMENTO
    // ============================================
    if (acao === 'criar') {
      // Validação 1: Contrato Ativo
      const { data: contrato, error: erroContrato } = await supabase
        .from('contratos_cliente')
        .select('*')
        .eq('cliente_id', cliente_id)
        .eq('status', 'ativo')
        .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString().split('T')[0]}`)
        .single()

      if (erroContrato || !contrato) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Cliente não possui contrato ativo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validação 2: Horário Disponível
      const dataHora = new Date(data_hora)
      const diaSemana = dataHora.getDay()

      const { data: horario, error: erroHorario } = await supabase
        .from('horarios_funcionamento')
        .select('*')
        .eq('profissional_id', profissional_id)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true)
        .single()

      if (erroHorario || !horario) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Profissional não trabalha neste horário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validação 3: Studio Aberto (Sem Fechamento)
      const dataFormatada = data_hora.split('T')[0]
      const { data: fechamento } = await supabase
        .from('periodos_fechamento')
        .select('*')
        .or(`profissional_id.is.null,profissional_id.eq.${profissional_id}`)
        .lte('data_inicio', dataFormatada)
        .gte('data_fim', dataFormatada)
        .single()

      if (fechamento) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            erro: `Studio fechado neste período (${fechamento.motivo})`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validação 4: Sala Não Ocupada (Pilates Only)
      const { data: profissional } = await supabase
        .from('profissionais')
        .select('tipo')
        .eq('id', profissional_id)
        .single()

      if (profissional?.tipo === 'pilates') {
        const { data: tatiane } = await supabase
          .from('profissionais')
          .select('id')
          .eq('nome', 'Tatiane Kafka Ghizoni')
          .single()

        const { data: renata } = await supabase
          .from('profissionais')
          .select('id')
          .eq('nome', 'Renata Tomazetti')
          .single()

        const { data: ocupacao } = await supabase
          .from('agendamentos')
          .select('*')
          .in('profissional_id', [tatiane?.id, renata?.id].filter(Boolean))
          .eq('data_hora', data_hora)
          .in('status', ['agendado', 'realizado'])

        if (ocupacao && ocupacao.length > 0) {
          return new Response(
            JSON.stringify({
              sucesso: false,
              erro: 'Sala de Pilates já está ocupada neste horário',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      // Validação 5: Pacote com Sessões Disponíveis
      if (contrato.tipo === 'pacote') {
        const { data: consumo } = await supabase
          .from('consumo_pacote')
          .select('sessoes_consumidas')
          .eq('contrato_id', contrato.id)

        const { data: pacote } = await supabase
          .from('pacotes')
          .select('quantidade_sessoes')
          .eq('id', contrato.pacote_id)
          .single()

        const totalConsumido =
          consumo?.reduce((sum: number, c: any) => sum + c.sessoes_consumidas, 0) || 0
        if (totalConsumido >= (pacote?.quantidade_sessoes || 0)) {
          return new Response(
            JSON.stringify({ sucesso: false, erro: 'Pacote sem sessões disponíveis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      // Criar Agendamento
      const { data, error } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id,
          profissional_id,
          data_hora,
          tipo: 'aula',
          status: 'agendado',
        })
        .select()
        .single()

      if (error) throw error

      // Consumir Sessão (se Pacote)
      if (contrato.tipo === 'pacote') {
        await supabase.from('consumo_pacote').insert({
          contrato_id: contrato.id,
          agendamento_id: data.id,
          sessoes_consumidas: 1,
        })
      }

      return new Response(JSON.stringify({ sucesso: true, agendamento_id: data.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================
    // AÇÃO 2: CANCELAR AGENDAMENTO + CRIAR REPOSIÇÃO
    // ============================================
    if (acao === 'cancelar') {
      const { data: agendamento, error: getErr } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamento_id)
        .single()

      if (getErr) throw getErr

      // Validar 6h de antecedência
      const dataAula = new Date(agendamento.data_hora).getTime()
      const agora = new Date().getTime()
      const horasRestantes = (dataAula - agora) / (1000 * 60 * 60)

      if (horasRestantes < 6) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Cancelamento requer 6 horas de antecedência' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Marcar como cancelado
      const { error: updErr } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamento_id)

      if (updErr) throw updErr

      // Criar Reposição
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() + 30)

      await supabase.from('reposicoes').insert({
        agendamento_original_id: agendamento.id,
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        data_limite: dataLimite.toISOString().split('T')[0],
        status: 'pendente',
      })

      return new Response(JSON.stringify({ sucesso: true, com_reposicao: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================
    // AÇÃO 3: MARCAR REPOSIÇÃO
    // ============================================
    if (acao === 'marcar_reposicao') {
      const { data: reposicao, error: getRepErr } = await supabase
        .from('reposicoes')
        .select('*')
        .eq('id', reposicao_id)
        .single()

      if (getRepErr || !reposicao) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Reposição não encontrada ou expirada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validar se reposição ainda é válida
      if (new Date(reposicao.data_limite) < new Date()) {
        return new Response(JSON.stringify({ sucesso: false, erro: 'Reposição expirou' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validar 6h de antecedência
      const dataAula = new Date(data_hora).getTime()
      const agora = new Date().getTime()
      const horasRestantes = (dataAula - agora) / (1000 * 60 * 60)

      if (horasRestantes < 6) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Reposição requer 6 horas de antecedência' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Criar novo agendamento (reposição)
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

      // Marcar reposição como marcada
      await supabase
        .from('reposicoes')
        .update({
          status: 'marcada',
          agendamento_reposicao_id: novoAgendamento.id,
          data_marcacao: new Date().toISOString(),
        })
        .eq('id', reposicao_id)

      return new Response(JSON.stringify({ sucesso: true, agendamento_id: novoAgendamento.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================
    // AÇÃO 4: MARCAR COMO REALIZADO
    // ============================================
    if (acao === 'marcar_realizado') {
      const { error: updErr } = await supabase
        .from('agendamentos')
        .update({ status: 'realizado' })
        .eq('id', agendamento_id)

      if (updErr) throw updErr

      return new Response(JSON.stringify({ sucesso: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sucesso: false, erro: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ sucesso: false, erro: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
