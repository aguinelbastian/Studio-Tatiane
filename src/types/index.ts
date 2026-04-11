export type UserRole = 'Admin' | 'Profissional'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export type ProfissionalType = 'Professor' | 'Massoterapeuta'

export interface Profissional {
  id: string
  userId: string
  name: string
  type: ProfissionalType
  commissionPercentage: number
}

export type ClienteStatus = 'Ativo' | 'Inativo'

export interface Cliente {
  id: string
  name: string
  phone: string
  email: string
  status: ClienteStatus
  createdAt: string
}

export interface Plano {
  id: string
  name: string
  price: number
  frequency: string // e.g., '2x na semana'
  durationMonths: number
  sessionCount: number
}

export type ContratoStatus = 'Ativo' | 'Cancelado' | 'Concluído'

export interface Contrato {
  id: string
  clienteId: string
  planoId: string
  startDate: string
  endDate: string
  status: ContratoStatus
}

export type AgendamentoStatus = 'Agendado' | 'Realizado' | 'Cancelado'

export interface Agendamento {
  id: string
  profissionalId: string
  clienteId: string
  date: string // ISO date string
  status: AgendamentoStatus
  notes?: string
}
