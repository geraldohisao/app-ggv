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
}

// Função para buscar dados de ranking dos SDRs
async function fetchSdrRankingData(days: number = 30): Promise<SdrRankingData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    console.log('🔍 Buscando dados de ranking dos SDRs:', { days });

    // USAR SEMPRE A FUNÇÃO ORIGINAL SEM FILTRO DE PERÍODO (mostrar todas as ligações)
    console.log('📊 Usando função get_sdr_metrics para TODAS as ligações (sem filtro de período)...');
    const { data, error } = await supabase
      .rpc('get_sdr_metrics', { p_days: 99999 }); // Usar um valor muito alto para pegar todas

    if (error) {
      console.error('❌ Erro ao buscar dados de SDRs:', error);
      return [];
    }

    console.log('✅ Dados de SDRs carregados:', data?.length || 0);
    console.log('🔍 DADOS BRUTOS RECEBIDOS:', data);

    // Converter para o formato esperado e ordenar por volume
    const result: SdrRankingData[] = (data || [])
      .map((row: any) => {
        console.log('📊 PROCESSANDO ROW:', row);
        return {
          sdr_id: row.sdr_id,
          sdr_name: row.sdr_name,
          total_calls: Number(row.total_calls),
          answered_calls: Number(row.answered_calls),
          avg_duration: Number(row.avg_duration) || 0,
          avg_score: Number(row.avg_score) || 0
        };
      })
      .sort((a, b) => b.total_calls - a.total_calls) // Ordenar por volume decrescente
      .slice(0, 10); // Top 10

    console.log('📊 Ranking processado:', result);
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados de SDRs:', error);
    return [];
  }
}

export default function SdrScoreChart({ selectedPeriod = 30, data }: SdrScoreChartProps) {
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
        const rankingData = await fetchSdrRankingData(selectedPeriod);
        setChartData(rankingData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados de ranking:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, data]);

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

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">🏆 Ranking por Volume de Chamadas</h3>
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


