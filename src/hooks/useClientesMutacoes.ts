import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useClientesMutacoes(onSuccess?: () => void) {
  const { toast } = useToast()

  const handleAction = async (promise: Promise<any>, successMsg: string) => {
    try {
      const { error } = await promise
      if (error) throw error
      toast({ title: successMsg })
      if (onSuccess) onSuccess()
      return true
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      return false
    }
  }

  return {
    criarCliente: (dados: any) =>
      handleAction(supabase.from('clientes').insert([dados]), 'Cliente criado com sucesso'),
    editarCliente: (id: string, dados: any) =>
      handleAction(supabase.from('clientes').update(dados).eq('id', id), 'Cliente atualizado'),
    deletarCliente: (id: string) =>
      handleAction(
        supabase.from('clientes').update({ status: 'cancelado' }).eq('id', id),
        'Cliente cancelado',
      ),
    criarContrato: (dados: any) =>
      handleAction(supabase.from('contratos_cliente').insert([dados]), 'Contrato criado'),
    editarContrato: (id: string, dados: any) =>
      handleAction(
        supabase.from('contratos_cliente').update(dados).eq('id', id),
        'Contrato atualizado',
      ),
    pausarContrato: (id: string) =>
      handleAction(
        supabase.from('contratos_cliente').update({ status: 'pausado' }).eq('id', id),
        'Contrato pausado',
      ),
    cancelarContrato: async (id: string, reembolso: number) => {
      try {
        const { error } = await supabase
          .from('contratos_cliente')
          .update({ status: 'cancelado' })
          .eq('id', id)
        if (error) throw error
        if (reembolso > 0) {
          await supabase.from('pagamentos').insert([
            {
              contrato_id: id,
              valor: -reembolso,
              metodo: 'transferencia',
              status: 'confirmado',
              observacoes: 'Reembolso',
            },
          ])
        }
        toast({ title: `Contrato cancelado. Reembolso: R$ ${reembolso.toFixed(2)}` })
        if (onSuccess) onSuccess()
        return true
      } catch (err: any) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
        return false
      }
    },
    renovarContrato: (dados: any) =>
      handleAction(supabase.from('contratos_cliente').insert([dados]), 'Contrato renovado'),
    criarPlano: (dados: any) =>
      handleAction(supabase.from('planos').insert([dados]), 'Plano criado'),
    editarPlano: (id: string, dados: any) =>
      handleAction(supabase.from('planos').update(dados).eq('id', id), 'Plano atualizado'),
    desativarPlano: (id: string) =>
      handleAction(
        supabase.from('planos').update({ ativo: false }).eq('id', id),
        'Plano desativado',
      ),
    criarPacote: (dados: any) =>
      handleAction(supabase.from('pacotes').insert([dados]), 'Pacote criado'),
    editarPacote: (id: string, dados: any) =>
      handleAction(supabase.from('pacotes').update(dados).eq('id', id), 'Pacote atualizado'),
    desativarPacote: (id: string) =>
      handleAction(
        supabase.from('pacotes').update({ ativo: false }).eq('id', id),
        'Pacote desativado',
      ),
    criarHorario: (dados: any) =>
      handleAction(supabase.from('horarios_funcionamento').insert([dados]), 'Horário criado'),
    editarHorario: (id: string, dados: any) =>
      handleAction(
        supabase.from('horarios_funcionamento').update(dados).eq('id', id),
        'Horário atualizado',
      ),
    criarPeriodoFechamento: (dados: any) =>
      handleAction(supabase.from('periodos_fechamento').insert([dados]), 'Período criado'),
    editarPeriodoFechamento: (id: string, dados: any) =>
      handleAction(
        supabase.from('periodos_fechamento').update(dados).eq('id', id),
        'Período atualizado',
      ),
    deletarPeriodoFechamento: (id: string) =>
      handleAction(supabase.from('periodos_fechamento').delete().eq('id', id), 'Período deletado'),
  }
}
