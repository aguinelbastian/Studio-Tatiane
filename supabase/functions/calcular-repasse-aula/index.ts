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

    const { error: updErr } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', agendamento_id)
    
    if (updErr) throw updErr

    if (status !== 'realizado' && status !== 'falta_sem_aviso') {
      return new Response(JSON.stringify({ sucesso: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: agendamento } = await supabase
      .from('agendamentos')
      .select('*, profissional:profissionais(*)')
      .eq('id', agendamento_id)
      .single()

    if (!agendamento || !agendamento.profissional) {
        return new Response(JSON.stringify({ sucesso: true, alerta: 'Profissional não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const percentual = agendamento.profissional.comissao_percentual || 0
    if (percentual <= 0) {
        return new Response(JSON.stringify({ sucesso: true, alerta: 'Profissional sem comissão' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let valor_bruto = 180 
    
    const { data: consumo } = await supabase
      .from('consumo_pacote')
      .select('contrato:contratos_cliente(*, plano:planos(*), pacote:pacotes(*))')
      .eq('agendamento_id', agendamento_id)
      .single()

    let contrato = consumo?.contrato
    if (!contrato) {
      const { data: contratos } = await supabase
        .from('contratos_cliente')
        .select('*, plano:planos(*), pacote:pacotes(*)')
        .eq('cliente_id', agendamento.cliente_id)
        .eq('status', 'ativo')
        .order('data_criacao', { ascending: false })
        .limit(1)
      if (contratos && contratos.length > 0) contrato = contratos[0]
    }

    if (contrato) {
      if (contrato.tipo === 'pacote' && contrato.pacote) {
        valor_bruto = contrato.pacote.preco / (contrato.pacote.quantidade_sessoes || 1)
      } else if (contrato.tipo === 'plano' && contrato.plano) {
        const semanas = (contrato.plano.duracao_dias || 30) / 7
        const totalAulas = semanas * (contrato.plano.frequencia || 1)
        valor_bruto = contrato.plano.preco / (totalAulas || 1)
      }
    }

    const valor_repasse = (valor_bruto * percentual) / 100

    const { error: repErr } = await supabase
      .from('repasses_profissionais')
      .insert({
        profissional_id: agendamento.profissional_id,
        agendamento_id: agendamento_id,
        valor_bruto,
        percentual,
        valor_repasse,
        data_aula: agendamento.data_hora,
        status_pagamento: 'pendente'
      })
    
    if (repErr) throw repErr

    return new Response(JSON.stringify({ 
      sucesso: true, 
      repasse: {
        profissional: agendamento.profissional.nome,
        valor: valor_repasse
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ sucesso: false, erro: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
