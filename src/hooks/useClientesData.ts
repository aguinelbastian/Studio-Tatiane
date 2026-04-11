// src/hooks/useClientesData.ts - VERSÃO CORRIGIDA

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export const useClientesData = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clientes
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .eq('status', 'ativo')
          .order('nome', { ascending: true })
          .limit(100);

        if (clientesError) throw clientesError;
        setClientes(clientesData || []);

        // Contratos
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos_cliente')
          .select('*')
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false })
          .limit(100);

        if (contratosError) throw contratosError;
        setContratos(contratosData || []);

        // Planos
        const { data: planosData, error: planosError } = await supabase
          .from('planos')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true })
          .limit(100);

        if (planosError) throw planosError;
        setPlanos(planosData || []);

        // Pacotes
        const { data: pacotesData, error: pacotesError } = await supabase
          .from('pacotes')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true })
          .limit(100);

        if (pacotesError) throw pacotesError;
        setPacotes(pacotesData || []);

        // Horários
        const { data: horariosData, error: horariosError } = await supabase
          .from('horarios_funcionamento')
          .select('*')
          .eq('ativo', true)
          .order('dia_semana', { ascending: true })
          .limit(100);

        if (horariosError) throw horariosError;
        setHorarios(horariosData || []);

        // Períodos
        const { data: periodosData, error: periodosError } = await supabase
          .from('periodos_fechamento')
          .select('*')
          .gte('data_fim', new Date().toISOString().split('T')[0])
          .order('data_inicio', { ascending: true })
          .limit(100);

        if (periodosError) throw periodosError;
        setPeriodos(periodosData || []);

      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados');
        console.error('Erro em useClientesData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Revalidar a cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { clientes, contratos, planos, pacotes, horarios, periodos, loading, error };
};
