import React, { useState, useMemo, Fragment } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const HOURS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
]

export function CalendarioAgendamentos({
  agendamentos,
  profissionais,
  onSlotClick,
  onEventClick,
}: any) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [profFilter, setProfFilter] = useState('todos')

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const today = () => setCurrentDate(new Date())

  const agendamentosBySlot = useMemo(() => {
    const map = new Map()
    agendamentos.forEach((a: any) => {
      const date = new Date(a.data_hora)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    })
    return map
  }, [agendamentos])

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="font-medium ml-2 capitalize text-sm sm:text-base">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={profFilter} onValueChange={setProfFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todos os Profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Profissionais</SelectItem>
              {profissionais.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sm:grid-cols-[80px_repeat(7,1fr)] min-w-[700px] pb-4">
          <div className="bg-muted p-2 text-center text-xs font-medium border-b border-r sticky top-0 z-20">
            Hora
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="bg-muted p-2 text-center text-xs font-medium truncate border-b border-r sticky top-0 z-20"
            >
              <span className="hidden sm:inline">{format(day, 'EEEE', { locale: ptBR })}</span>
              <span className="sm:hidden">{format(day, 'EEE', { locale: ptBR })}</span>
              <br />
              <span className="text-muted-foreground">{format(day, 'dd/MM')}</span>
            </div>
          ))}

          {HOURS.map((hour) => (
            <Fragment key={hour}>
              <div className="bg-background p-2 text-center text-xs text-muted-foreground border-b border-r flex items-center justify-center sticky left-0 z-10">
                {hour}
              </div>
              {days.map((day) => {
                const datetime = new Date(day)
                const [h, m] = hour.split(':')
                datetime.setHours(parseInt(h), parseInt(m), 0, 0)

                const key = `${datetime.getFullYear()}-${datetime.getMonth()}-${datetime.getDate()}-${datetime.getHours()}`
                const cellAgendamentos = (agendamentosBySlot.get(key) || []).filter((a: any) => {
                  if (profFilter !== 'todos' && a.profissional_id !== profFilter) return false
                  return true
                })

                return (
                  <div
                    key={datetime.toISOString()}
                    className="bg-background border-b border-r p-1 min-h-[80px] relative hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => onSlotClick(datetime, profFilter)}
                  >
                    <div className="space-y-1">
                      {cellAgendamentos.map((ag: any) => (
                        <div
                          key={ag.id}
                          className={cn(
                            'text-[10px] sm:text-xs p-1.5 rounded flex flex-col justify-between items-start shadow-sm text-white transition-transform hover:scale-[1.02]',
                            ag.status === 'cancelado' &&
                              'opacity-50 line-through grayscale !bg-muted-foreground',
                          )}
                          style={{
                            backgroundColor:
                              ag.status !== 'cancelado'
                                ? ag.profissionais?.cor_calendario || '#3b82f6'
                                : undefined,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(ag)
                          }}
                        >
                          <span className="font-medium truncate w-full">{ag.clientes?.nome}</span>
                          <div className="flex justify-between w-full opacity-90 mt-0.5">
                            <span className="truncate max-w-[60px]">
                              {ag.profissionais?.nome?.split(' ')[0]}
                            </span>
                            {ag.tipo === 'reposicao' && (
                              <span className="font-bold border border-white/30 px-1 rounded text-[9px] leading-none flex items-center">
                                REP
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden group-hover:flex absolute inset-0 items-center justify-center bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
