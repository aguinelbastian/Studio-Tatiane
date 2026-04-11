import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface FiltrosRelatorioProps {
  periodo: string
  setPeriodo: (val: string) => void
  profissional?: string
  setProfissional?: (val: string) => void
  busca?: string
  setBusca?: (val: string) => void
}

export function FiltrosRelatorio({
  periodo,
  setPeriodo,
  profissional,
  setProfissional,
  busca,
  setBusca,
}: FiltrosRelatorioProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
      <div className="w-full sm:w-48">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este Mês</SelectItem>
            <SelectItem value="trimestre">Este Trimestre</SelectItem>
            <SelectItem value="semestre">Este Semestre</SelectItem>
            <SelectItem value="ano">Este Ano</SelectItem>
            <SelectItem value="todos">Todo o Período</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {setProfissional && (
        <div className="w-full sm:w-48">
          <Select value={profissional || 'todos'} onValueChange={setProfissional}>
            <SelectTrigger>
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="tatiane">Tatiane</SelectItem>
              <SelectItem value="renata">Renata</SelectItem>
              <SelectItem value="miriam">Miriam</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {setBusca !== undefined && (
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar cliente..."
            value={busca || ''}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
