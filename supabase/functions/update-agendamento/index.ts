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

    if (acao === 'criar') {
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
      return new Response(JSON.stringify({ sucesso: true, agendamento_id: data.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (acao === 'cancelar') {
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
      return new Response(JSON.stringify({ sucesso: true, com_reposicao: isComAntecedencia }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (acao === 'marcar_reposicao') {
      const { data: reposicao, error: getRepErr } = await supabase
        .from('reposicoes')
        .select('*')
        .eq('id', reposicao_id)
        .single()
      if (getRepErr || !reposicao) throw new Error('Reposição não encontrada')

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
