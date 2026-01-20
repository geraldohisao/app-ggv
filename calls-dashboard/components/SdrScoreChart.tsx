import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface SdrRankingData {
  sdr_id: string;
  sdr_name: string;
  total_calls: number;
  answered_calls: number;
  avg_duration: number;
  avg_score: number;
}

interface SdrScoreChartProps {
  selectedPeriod?: number;
  data?: any[];
  startDate?: string;
  endDate?: string;
}

// Função para buscar dados de ranking dos SDRs (apenas usuários ativos)
async function fetchSdrRankingData(days: number = 30, startDate?: string, endDate?: string): Promise<SdrRankingData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    const useCustomRange = !!(startDate && endDate);
    console.log('🔍 Buscando dados de ranking dos SDRs:', { days, startDate, endDate, useCustomRange });

    // Se houver período personalizado, calcular no front com base em chamadas filtradas
    if (useCustomRange) {
      const startIso = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const endIso = new Date(endDate + 'T23:59:59.999Z').toISOString();
      const limit = 5000;
      const maxRecords = 50000;
      let offset = 0;
      let allCalls: any[] = [];
      let totalCount = 0;

      while (offset < maxRecords) {
        const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_filters', {
          p_sdr: null,
          p_status: null,
          p_type: null,
          p_start_date: startIso,
          p_end_date: endIso,
          p_limit: limit,
          p_offset: offset,
          p_sort_by: 'created_at',
          p_min_duration: null,
          p_max_duration: null,
          p_min_score: null,
          p_search_query: null
        });

        if (callsError) {
          console.error('❌ Erro ao buscar chamadas filtradas:', callsError);
          break;
        }

        const chunk = Array.isArray(callsData) ? callsData : [];
        if (chunk.length === 0) break;

        totalCount = Number(chunk[0]?.total_count || totalCount);
        allCalls = allCalls.concat(chunk);

        if (allCalls.length >= totalCount) break;
        offset += limit;
      }

      if (allCalls.length === 0) {
        console.log('📭 Nenhuma chamada encontrada no período personalizado');
        return [];
      }

      if (totalCount > maxRecords) {
        console.warn('⚠️ Limite máximo atingido no período personalizado. Dados podem estar incompletos.');
      }

      const sdrMap = new Map<string, SdrRankingData & { durationSum: number; durationCount: number }>();
      allCalls.forEach((call: any) => {
        const sdrId = call.sdr_id || call.agent_id || 'desconhecido';
        const sdrName = call.sdr_name || call.agent_id || 'SDR';
        const key = String(sdrId).toLowerCase();
        const duration = Number(call.duration_seconds || call.duration || 0);

        if (!sdrMap.has(key)) {
          sdrMap.set(key, {
            sdr_id: String(sdrId),
            sdr_name: String(sdrName),
            total_calls: 0,
            answered_calls: 0,
            avg_duration: 0,
            avg_score: 0,
            durationSum: 0,
            durationCount: 0
          });
        }

        const item = sdrMap.get(key)!;
        item.total_calls += 1;
        if (call.status_voip === 'normal_clearing') {
          item.answered_calls += 1;
          if (duration > 30) {
            item.durationSum += duration;
            item.durationCount += 1;
          }
        }
      });

      let result = Array.from(sdrMap.values()).map((item) => ({
        sdr_id: item.sdr_id,
        sdr_name: item.sdr_name,
        total_calls: item.total_calls,
        answered_calls: item.answered_calls,
        avg_duration: item.durationCount > 0 ? Math.round(item.durationSum / item.durationCount) : 0,
        avg_score: 0
      }));

      // Filtrar por usuários ativos (se conseguimos a lista)
      const { data: activeProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('email, is_active')
        .eq('is_active', true);

      if (!profilesErr && activeProfiles && activeProfiles.length > 0) {
        const activeUsernames = new Set(
          activeProfiles.map((p: any) => {
            const email = p.email?.toLowerCase() || '';
            return email.split('@')[0];
          }).filter(Boolean)
        );

        const beforeFilter = result.length;
        result = result.filter((sdr) => {
          const sdrUsername = (sdr.sdr_id?.toLowerCase() || '').split('@')[0];
          return activeUsernames.has(sdrUsername);
        });

        if (result.length === 0 && beforeFilter > 0) {
          result = Array.from(sdrMap.values()).map((item) => ({
            sdr_id: item.sdr_id,
            sdr_name: item.sdr_name,
            total_calls: item.total_calls,
            answered_calls: item.answered_calls,
            avg_duration: item.durationCount > 0 ? Math.round(item.durationSum / item.durationCount) : 0,
            avg_score: 0
          }));
        }
      }

      return result.sort((a, b) => b.total_calls - a.total_calls).slice(0, 10);
    }

    // Buscar métricas primeiro (período relativo)
    const { data, error } = await supabase.rpc('get_sdr_metrics', { p_days: days });

    if (error) {
      console.error('❌ Erro ao buscar dados de SDRs:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('📭 Nenhum dado de SDR encontrado na RPC');
      return [];
    }

    console.log('✅ Dados de SDRs carregados:', data.length);
    console.log('🔍 SDRs encontrados:', data.map((d: any) => ({ id: d.sdr_id, name: d.sdr_name })));

    // Tentar buscar perfis ativos para filtrar
    let activeUsernames: Set<string> = new Set();
    try {
      const { data: activeProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('email, is_active')
        .eq('is_active', true);

      if (profilesErr) {
        console.warn('⚠️ Erro ao buscar perfis ativos:', profilesErr);
      } else if (activeProfiles && activeProfiles.length > 0) {
        console.log('✅ Perfis ativos carregados:', activeProfiles.length);
        console.log('🔍 Emails ativos:', activeProfiles.map((p: any) => p.email));
        
        activeUsernames = new Set(
          activeProfiles.map((p: any) => {
            const email = p.email?.toLowerCase() || '';
            return email.split('@')[0];
          }).filter(Boolean)
        );
        console.log('🔍 Usernames ativos:', Array.from(activeUsernames));
      }
    } catch (profileErr) {
      console.warn('⚠️ Exceção ao buscar perfis:', profileErr);
    }

    // Converter para o formato esperado
    let result: SdrRankingData[] = (data || []).map((row: any) => ({
      sdr_id: row.sdr_id,
      sdr_name: row.sdr_name,
      total_calls: Number(row.total_calls),
      answered_calls: Number(row.answered_calls),
      avg_duration: Number(row.avg_duration) || 0,
      avg_score: Number(row.avg_score) || 0
    }));

    // Filtrar por usuários ativos (se conseguimos a lista)
    if (activeUsernames.size > 0) {
      const beforeFilter = result.length;
      result = result.filter((sdr) => {
        const sdrUsername = (sdr.sdr_id?.toLowerCase() || '').split('@')[0];
        const isActive = activeUsernames.has(sdrUsername);
        if (!isActive) {
          console.log('⏭️ SDR inativo ignorado:', sdr.sdr_name, sdr.sdr_id, '| username:', sdrUsername);
        }
        return isActive;
      });
      console.log(`📊 Filtro de ativos: ${beforeFilter} → ${result.length} SDRs`);
      
      // Se filtrou todos, pode ser problema de matching - mostrar sem filtro
      if (result.length === 0 && beforeFilter > 0) {
        console.warn('⚠️ TODOS SDRs foram filtrados! Verificar matching de usernames.');
        console.warn('⚠️ Mostrando dados SEM filtro de ativos como fallback.');
        result = (data || []).map((row: any) => ({
          sdr_id: row.sdr_id,
          sdr_name: row.sdr_name,
          total_calls: Number(row.total_calls),
          answered_calls: Number(row.answered_calls),
          avg_duration: Number(row.avg_duration) || 0,
          avg_score: Number(row.avg_score) || 0
        }));
      }
    }

    // Ordenar por volume e limitar a top 10
    result = result
      .sort((a, b) => b.total_calls - a.total_calls)
      .slice(0, 10);

    console.log('📊 Ranking final:', result.length, 'SDRs');
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados de SDRs:', error);
    return [];
  }
}

export default function SdrScoreChart({ selectedPeriod = 30, data, startDate, endDate }: SdrScoreChartProps) {
  const [chartData, setChartData] = useState<SdrRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      // Se dados foram passados como props, usar eles
      if (data && data.length > 0) {
        console.log('📊 Usando dados passados como props:', data);
        setChartData(data);
        setLoading(false);
        return;
      }
      
      try {
        const rankingData = await fetchSdrRankingData(selectedPeriod, startDate, endDate);
        setChartData(rankingData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados de ranking:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, data, startDate, endDate]);

  // Listener para novas análises em tempo real
  useEffect(() => {
    console.log('🔄 Configurando listener de tempo real para call_analysis (ranking volume)...');
    
    const channel = supabase
      .channel('volume_ranking_analysis_updates')
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'call_analysis' 
        }, 
        (payload) => {
          console.log('🔔 Nova análise detectada! Recarregando ranking de volume...', payload);
          
          // Recarregar dados após nova análise
          setTimeout(async () => {
            setLoading(true);
            try {
              const rankingData = await fetchSdrRankingData(selectedPeriod);
              setChartData(rankingData);
              console.log('✅ Ranking de volume atualizado em tempo real!');
            } catch (err) {
              console.error('❌ Erro ao atualizar ranking de volume:', err);
            } finally {
              setLoading(false);
            }
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo listener de análises (volume)...');
      supabase.removeChannel(channel);
    };
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">🏆 Ranking por Volume de Chamadas</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Carregando ranking...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">🏆 Ranking por Volume de Chamadas</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-red-500">Erro: {error}</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">🏆 Ranking por Volume de Chamadas</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Nenhum dado disponível</div>
        </div>
      </div>
    );
  }

  const maxCalls = Math.max(...chartData.map(d => d.total_calls));

  // Calcular totais para exibição
  const totalCalls = chartData.reduce((sum, sdr) => sum + sdr.total_calls, 0);

  // Formatar período para exibição
  const getPeriodText = () => {
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    return `Últimos ${selectedPeriod} dias`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">🏆 Ranking por Volume de Chamadas</h3>
        <p className="text-xs text-slate-500">
          {getPeriodText()} • {totalCalls.toLocaleString('pt-BR')} chamadas no período
        </p>
      </div>
      
      <div className="space-y-3">
        {chartData.map((sdr, index) => {
          const percentage = maxCalls > 0 ? (sdr.total_calls / maxCalls) * 100 : 0;
          
          return (
            <div key={sdr.sdr_id} className="flex items-center gap-3">
              <div className="w-6 text-sm font-medium text-slate-500">
                #{index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-slate-800">
                    {sdr.sdr_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {sdr.total_calls} chamadas
                  </div>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Taxa: {sdr.total_calls > 0 ? Math.round((sdr.answered_calls / sdr.total_calls) * 100) : 0}%</span>
                  <span>Duração: {
                    sdr.avg_duration > 0 
                      ? sdr.avg_duration >= 60 
                        ? Math.floor(sdr.avg_duration / 60) + 'm ' + Math.round(sdr.avg_duration % 60) + 's'
                        : Math.round(sdr.avg_duration) + 's'
                      : '0s'
                  }</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


