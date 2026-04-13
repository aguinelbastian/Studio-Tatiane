import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { agendamento_id, status } = await req.json()

    // Validação: status deve ser válido
    if (!['realizado', 'falta_sem_aviso', 'reposicao', 'cancelado', 'agendado', 'trancado'].includes(status)) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Status inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Atualiza status do agendamento
    const { error: updErr } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', agendamento_id)
    
    if (updErr) throw updErr

    // Apenas calcula repasse para aulas realizadas ou faltas sem aviso
    if (status !== 'realizado' && status !== 'falta_sem_aviso') {
      return new Response(JSON.stringify({ sucesso: true, mensagem: `Status atualizado para ${status}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Busca dados completos do agendamento
    const { data: agendamento, error: agErr } = await supabase
      .from('agendamentos')
      .select('*, profissional:profissionais(*), cliente:clientes(*)')
      .eq('id', agendamento_id)
      .single()

    if (agErr || !agendamento || !agendamento.profissional) {
      return new Response(JSON.stringify({ sucesso: true, alerta: 'Profissional não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validação: profissional deve ter comissão
    const percentual = agendamento.profissional.comissao_percentual || 0
    if (percentual <= 0) {
      return new Response(JSON.stringify({ sucesso: true, alerta: 'Profissional sem comissão configurada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Valor padrão para aula avulsa
    let valor_bruto = 180
    let tipo_contrato = 'aula_avulsa'
    let contrato_id = null

    // Busca consumo de pacote (se houver)
    const { data: consumo } = await supabase
      .from('consumo_pacote')
      .select('contrato_id, contrato:contratos_cliente(*, plano:planos(*), pacote:pacotes(*))')
      .eq('agendamento_id', agendamento_id)
      .single()

    let contrato = consumo?.contrato
    contrato_id = consumo?.contrato_id

    // Se não encontrou via consumo_pacote, busca contrato ativo vigente
    if (!contrato) {
      const data_aula = new Date(agendamento.data_hora)
      const { data: contratos } = await supabase
        .from('contratos_cliente')
        .select('*, plano:planos(*), pacote:pacotes(*)')
        .eq('cliente_id', agendamento.cliente_id)
        .eq('status', 'ativo')
        .lte('data_inicio', data_aula.toISOString().split('T')[0])
        .or(`data_fim.is.null,data_fim.gte.${data_aula.toISOString().split('T')[0]}`)
        .order('data_criacao', { ascending: false })
        .limit(1)

      if (contratos && contratos.length > 0) {
        contrato = contratos[0]
        contrato_id = contrato.id
      }
    }

    // Calcula valor_bruto baseado no contrato
    if (contrato) {
      if (contrato.status === 'trancado') {
        return new Response(JSON.stringify({ sucesso: true, alerta: 'Contrato está trancado. Repasse não será gerado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (contrato.tipo === 'pacote' && contrato.pacote) {
        tipo_contrato = 'pacote'
        valor_bruto = contrato.pacote.preco / (contrato.pacote.quantidade_sessoes || 1)
      } else if (contrato.tipo === 'plano' && contrato.plano) {
        tipo_contrato = 'plano'
        // Cálculo correto: duracao_dias / 7 * frequencia
        const semanas = Math.ceil((contrato.plano.duracao_dias || 30) / 7)
        const totalAulas = semanas * (contrato.plano.frequencia || 1)
        valor_bruto = contrato.plano.preco / (totalAulas || 1)
      }
    }

    // Calcula valor do repasse
    const valor_repasse = Math.round((valor_bruto * percentual) / 100 * 100) / 100 // Arredonda para 2 casas decimais

    // Insere registro de repasse
    const { error: repErr } = await supabase
      .from('repasses_profissionais')
      .insert({
        profissional_id: agendamento.profissional_id,
        agendamento_id: agendamento_id,
        contrato_id: contrato_id,
        valor_bruto: Math.round(valor_bruto * 100) / 100,
        percentual,
        valor_repasse,
        data_aula: agendamento.data_hora,
        tipo_repasse: status === 'falta_sem_aviso' ? 'falta_sem_aviso' : 'aula_normal',
        status_pagamento: 'pendente'
      })
    
    if (repErr) throw repErr

    return new Response(JSON.stringify({ 
      sucesso: true, 
      mensagem: `Aula registrada e repasse calculado`,
      repasse: {
        profissional: agendamento.profissional.nome,
        valor_bruto: Math.round(valor_bruto * 100) / 100,
        percentual: `${percentual}%`,
        valor_repasse: valor_repasse,
        tipo_contrato: tipo_contrato
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('Erro em calcular-repasse-aula:', error)
    return new Response(JSON.stringify({ sucesso: false, erro: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})