import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Client com o JWT do usuário — usado apenas para identificar/autorizar o chamador.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const { agendamento_id, status } = await req.json()

    // Validação: status deve ser válido
    if (
      ![
        'realizado',
        'falta_sem_aviso',
        'reposicao',
        'cancelado',
        'agendado',
        'trancado',
        'a_repor',
      ].includes(status)
    ) {
      return json({ sucesso: false, erro: 'Status inválido' }, 400)
    }

    // --- Autorização: admin OU profissional dono do agendamento ---
    const { data: auth } = await userClient.auth.getUser()
    const callerEmail = auth?.user?.email
    if (!callerEmail) return json({ sucesso: false, erro: 'Não autenticado' }, 401)

    const { data: perfil } = await userClient
      .from('usuarios')
      .select('id, role')
      .eq('email', callerEmail)
      .single()
    const isAdmin = perfil?.role === 'admin' || perfil?.role === 'superuser'

    const { data: agOwner } = await userClient
      .from('agendamentos')
      .select('profissional_id')
      .eq('id', agendamento_id)
      .single()

    const { data: callerProf } = await userClient
      .from('profissionais')
      .select('id')
      .eq('usuario_id', perfil?.id)
      .maybeSingle()

    const isOwner = !!agOwner && !!callerProf && agOwner.profissional_id === callerProf.id
    if (!isAdmin && !isOwner) {
      return json({ sucesso: false, erro: 'Sem permissão para este agendamento' }, 403)
    }

    // Client com service role — usado para as escritas/leituras privilegiadas após autorizar.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Atualiza status do agendamento
    const { error: updErr } = await admin
      .from('agendamentos')
      .update({ status })
      .eq('id', agendamento_id)

    if (updErr) throw updErr

    // Apenas calcula repasse para aulas realizadas ou faltas sem aviso
    if (status !== 'realizado' && status !== 'falta_sem_aviso') {
      return json({ sucesso: true, mensagem: `Status atualizado para ${status}` })
    }

    // Busca dados completos do agendamento
    const { data: agendamento, error: agErr } = await admin
      .from('agendamentos')
      .select('*, profissional:profissionais(*), cliente:clientes(*)')
      .eq('id', agendamento_id)
      .single()

    if (agErr || !agendamento || !agendamento.profissional) {
      return json({ sucesso: true, alerta: 'Profissional não encontrado' })
    }

    // Validação: profissional deve ter comissão
    const percentual = agendamento.profissional.comissao_percentual || 0
    if (percentual <= 0) {
      return json({ sucesso: true, alerta: 'Profissional sem comissão configurada' })
    }

    // Valor padrão para aula avulsa
    let valor_bruto = 180
    let tipo_contrato = 'aula_avulsa'
    let contrato_id = null

    // Busca consumo de pacote (se houver)
    const { data: consumo } = await admin
      .from('consumo_pacote')
      .select('contrato_id, contrato:contratos_cliente(*, plano:planos(*), pacote:pacotes(*))')
      .eq('agendamento_id', agendamento_id)
      .single()

    let contrato = consumo?.contrato
    contrato_id = consumo?.contrato_id

    // Se não encontrou via consumo_pacote, busca contrato ativo vigente
    if (!contrato) {
      const data_aula = new Date(agendamento.data_hora)
      const { data: contratos } = await admin
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
        return json({ sucesso: true, alerta: 'Contrato está trancado. Repasse não será gerado.' })
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
    const valor_repasse = Math.round(((valor_bruto * percentual) / 100) * 100) / 100 // Arredonda para 2 casas decimais

    // Insere registro de repasse
    const { error: repErr } = await admin.from('repasses_profissionais').insert({
      profissional_id: agendamento.profissional_id,
      agendamento_id: agendamento_id,
      contrato_id: contrato_id,
      valor_bruto: Math.round(valor_bruto * 100) / 100,
      percentual,
      valor_repasse,
      data_aula: agendamento.data_hora,
      tipo_repasse: status === 'falta_sem_aviso' ? 'falta_sem_aviso' : 'aula_normal',
      status_pagamento: 'pendente',
    })

    if (repErr) throw repErr

    return json({
      sucesso: true,
      mensagem: `Aula registrada e repasse calculado`,
      repasse: {
        profissional: agendamento.profissional.nome,
        valor_bruto: Math.round(valor_bruto * 100) / 100,
        percentual: `${percentual}%`,
        valor_repasse: valor_repasse,
        tipo_contrato: tipo_contrato,
      },
    })
  } catch (error: any) {
    console.error('Erro em calcular-repasse-aula:', error)
    return json({ sucesso: false, erro: error.message }, 400)
  }
})
