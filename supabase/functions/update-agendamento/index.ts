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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Client com o JWT do usuário — usado apenas para identificar/autorizar o chamador.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    // Client com service role — usado para validações/escritas após autorizar
    // (algumas tabelas são admin-only sob RLS: horarios_funcionamento, periodos_fechamento, pacotes).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // --- Identidade do chamador ---
    const { data: auth } = await userClient.auth.getUser()
    const callerEmail = auth?.user?.email
    if (!callerEmail) return json({ sucesso: false, erro: 'Não autenticado' }, 401)

    const { data: perfil } = await userClient
      .from('usuarios')
      .select('id, role')
      .eq('email', callerEmail)
      .single()
    const isAdmin = perfil?.role === 'admin' || perfil?.role === 'superuser'

    const { data: callerProf } = await userClient
      .from('profissionais')
      .select('id')
      .eq('usuario_id', perfil?.id)
      .maybeSingle()
    const callerProfId = callerProf?.id ?? null

    // Autoriza o chamador para um profissional-alvo (admin OU dono).
    const authorizeFor = (alvoProfissionalId: string | null | undefined) =>
      isAdmin || (!!alvoProfissionalId && alvoProfissionalId === callerProfId)

    // Resolve o profissional-alvo de uma ação sobre agendamento existente.
    const profissionalDoAgendamento = async (agId: string) => {
      const { data } = await admin
        .from('agendamentos')
        .select('profissional_id')
        .eq('id', agId)
        .single()
      return data?.profissional_id ?? null
    }

    // ============================================
    // AÇÃO 1: CRIAR AGENDAMENTO
    // ============================================
    if (acao === 'criar') {
      if (!authorizeFor(profissional_id)) {
        return json({ sucesso: false, erro: 'Sem permissão para agendar por este profissional' }, 403)
      }

      // Validação 1: Contrato Ativo
      const { data: contrato, error: erroContrato } = await admin
        .from('contratos_cliente')
        .select('*')
        .eq('cliente_id', cliente_id)
        .eq('status', 'ativo')
        .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString().split('T')[0]}`)
        .single()

      if (erroContrato || !contrato) {
        return json({ sucesso: false, erro: 'Cliente não possui contrato ativo' }, 400)
      }

      // Validação 2: Horário Disponível
      const dataHora = new Date(data_hora)
      const diaSemana = dataHora.getDay()

      const { data: horario, error: erroHorario } = await admin
        .from('horarios_funcionamento')
        .select('*')
        .eq('profissional_id', profissional_id)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true)
        .single()

      if (erroHorario || !horario) {
        return json({ sucesso: false, erro: 'Profissional não trabalha neste horário' }, 400)
      }

      // Validação 3: Studio Aberto (Sem Fechamento)
      const dataFormatada = data_hora.split('T')[0]
      const { data: fechamento } = await admin
        .from('periodos_fechamento')
        .select('*')
        .or(`profissional_id.is.null,profissional_id.eq.${profissional_id}`)
        .lte('data_inicio', dataFormatada)
        .gte('data_fim', dataFormatada)
        .single()

      if (fechamento) {
        return json(
          { sucesso: false, erro: `Studio fechado neste período (${fechamento.motivo})` },
          400,
        )
      }

      // Validação 4: Sala Não Ocupada (Pilates Only)
      const { data: profissional } = await admin
        .from('profissionais')
        .select('tipo')
        .eq('id', profissional_id)
        .single()

      if (profissional?.tipo === 'pilates') {
        // Profissionais de pilates concorrem pela mesma sala (sem hardcode de nomes).
        const { data: pilatesProfs } = await admin
          .from('profissionais')
          .select('id')
          .eq('tipo', 'pilates')

        const pilatesIds = (pilatesProfs ?? []).map((p: any) => p.id)

        const { data: ocupacao } = await admin
          .from('agendamentos')
          .select('id')
          .in('profissional_id', pilatesIds.length ? pilatesIds : [profissional_id])
          .eq('data_hora', data_hora)
          .in('status', ['agendado', 'realizado'])

        if (ocupacao && ocupacao.length > 0) {
          return json({ sucesso: false, erro: 'Sala de Pilates já está ocupada neste horário' }, 400)
        }
      }

      // Validação 5: Pacote com Sessões Disponíveis
      if (contrato.tipo === 'pacote') {
        const { data: consumo } = await admin
          .from('consumo_pacote')
          .select('sessoes_consumidas')
          .eq('contrato_id', contrato.id)

        const { data: pacote } = await admin
          .from('pacotes')
          .select('quantidade_sessoes')
          .eq('id', contrato.pacote_id)
          .single()

        const totalConsumido =
          consumo?.reduce((sum: number, c: any) => sum + c.sessoes_consumidas, 0) || 0
        if (totalConsumido >= (pacote?.quantidade_sessoes || 0)) {
          return json({ sucesso: false, erro: 'Pacote sem sessões disponíveis' }, 400)
        }
      }

      // Criar Agendamento
      const { data, error } = await admin
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
        await admin.from('consumo_pacote').insert({
          contrato_id: contrato.id,
          agendamento_id: data.id,
          sessoes_consumidas: 1,
        })
      }

      return json({ sucesso: true, agendamento_id: data.id })
    }

    // ============================================
    // AÇÃO 2: CANCELAR AGENDAMENTO + CRIAR REPOSIÇÃO
    // ============================================
    if (acao === 'cancelar') {
      if (!authorizeFor(await profissionalDoAgendamento(agendamento_id))) {
        return json({ sucesso: false, erro: 'Sem permissão para este agendamento' }, 403)
      }

      const { data: agendamento, error: getErr } = await admin
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
        return json({ sucesso: false, erro: 'Cancelamento requer 6 horas de antecedência' }, 400)
      }

      // Marcar como cancelado
      const { error: updErr } = await admin
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamento_id)

      if (updErr) throw updErr

      // Criar Reposição
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() + 30)

      await admin.from('reposicoes').insert({
        agendamento_original_id: agendamento.id,
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        data_limite: dataLimite.toISOString().split('T')[0],
        status: 'pendente',
      })

      return json({ sucesso: true, com_reposicao: true })
    }

    // ============================================
    // AÇÃO 3: MARCAR REPOSIÇÃO
    // ============================================
    if (acao === 'marcar_reposicao') {
      if (!authorizeFor(profissional_id)) {
        return json({ sucesso: false, erro: 'Sem permissão para este profissional' }, 403)
      }

      const { data: reposicao, error: getRepErr } = await admin
        .from('reposicoes')
        .select('*')
        .eq('id', reposicao_id)
        .single()

      if (getRepErr || !reposicao) {
        return json({ sucesso: false, erro: 'Reposição não encontrada ou expirada' }, 400)
      }

      // Validar se reposição ainda é válida
      if (new Date(reposicao.data_limite) < new Date()) {
        return json({ sucesso: false, erro: 'Reposição expirou' }, 400)
      }

      // Validar 6h de antecedência
      const dataAula = new Date(data_hora).getTime()
      const agora = new Date().getTime()
      const horasRestantes = (dataAula - agora) / (1000 * 60 * 60)

      if (horasRestantes < 6) {
        return json({ sucesso: false, erro: 'Reposição requer 6 horas de antecedência' }, 400)
      }

      // Criar novo agendamento (reposição)
      const { data: novoAgendamento, error: insErr } = await admin
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
      await admin
        .from('reposicoes')
        .update({
          status: 'marcada',
          agendamento_reposicao_id: novoAgendamento.id,
          data_marcacao: new Date().toISOString(),
        })
        .eq('id', reposicao_id)

      return json({ sucesso: true, agendamento_id: novoAgendamento.id })
    }

    // ============================================
    // AÇÃO 4: MARCAR COMO REALIZADO
    // ============================================
    if (acao === 'marcar_realizado') {
      if (!authorizeFor(await profissionalDoAgendamento(agendamento_id))) {
        return json({ sucesso: false, erro: 'Sem permissão para este agendamento' }, 403)
      }

      const { error: updErr } = await admin
        .from('agendamentos')
        .update({ status: 'realizado' })
        .eq('id', agendamento_id)

      if (updErr) throw updErr

      return json({ sucesso: true })
    }

    return json({ sucesso: false, erro: 'Ação inválida' }, 400)
  } catch (error: any) {
    return json({ sucesso: false, erro: error.message }, 400)
  }
})
