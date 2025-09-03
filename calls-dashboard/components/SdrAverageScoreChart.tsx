import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface SdrScoreRankingData {
  sdr_id: string;
  sdr_name: string;
  total_calls: number;
  answered_calls: number;
  avg_score: number;
  answered_rate: number;
}

interface SdrAverageScoreChartProps {
  selectedPeriod?: number;
}

// Função para buscar dados de ranking por nota média
async function fetchSdrScoreRankingData(days: number = 30): Promise<SdrScoreRankingData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    console.log('🔍 Buscando dados de ranking por nota média:', { days });

    // Usar a mesma função SQL mas ordenar por nota
    const { data, error } = await supabase
      .rpc('get_sdr_metrics', { p_days: days });

    if (error) {
      console.error('❌ Erro ao buscar dados de SDRs por nota:', error);
      return [];
    }

    console.log('✅ Dados de SDRs por nota carregados:', data?.length || 0);

    // Converter para o formato esperado e ordenar por nota média
    const result: SdrScoreRankingData[] = (data || [])
      .map((row: any) => ({
        sdr_id: row.sdr_id,
        sdr_name: row.sdr_name,
        total_calls: Number(row.total_calls),
        answered_calls: Number(row.answered_calls),
        avg_score: Number(row.avg_score) || 0,
        answered_rate: Number(row.total_calls) > 0 ? 
          Math.round((Number(row.answered_calls) / Number(row.total_calls)) * 100) : 0
      }))
      .filter(sdr => sdr.avg_score > 0) // Apenas SDRs com nota
      .sort((a, b) => b.avg_score - a.avg_score) // Ordenar por nota decrescente
      .slice(0, 10); // Top 10

    console.log('📊 Ranking por nota processado:', result);
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados de SDRs por nota:', error);
    return [];
  }
}

export default function SdrAverageScoreChart({ selectedPeriod = 30 }: SdrAverageScoreChartProps) {
  const [chartData, setChartData] = useState<SdrScoreRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const rankingData = await fetchSdrScoreRankingData(selectedPeriod);
        setChartData(rankingData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados de ranking por nota:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">⭐ Ranking por Nota Média</h3>
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
          <h3 className="font-semibold text-slate-800">⭐ Ranking por Nota Média</h3>
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
          <h3 className="font-semibold text-slate-800">⭐ Ranking por Nota Média</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Nenhum SDR com nota disponível</div>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...chartData.map(d => d.avg_score));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">⭐ Ranking por Nota Média</h3>
        <p className="text-xs text-slate-500">Baseado em scorecards das chamadas</p>
      </div>
      
      <div className="space-y-3">
        {chartData.map((sdr, index) => {
          const percentage = maxScore > 0 ? (sdr.avg_score / maxScore) * 100 : 0;
          
          // Cores baseadas na nota
          const getScoreColor = (score: number) => {
            if (score >= 85) return 'bg-emerald-500';
            if (score >= 70) return 'bg-yellow-500';
            return 'bg-red-500';
          };
          
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
                  <div className="text-sm font-semibold text-slate-800">
                    {Math.round(sdr.avg_score)}
                  </div>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={`${getScoreColor(sdr.avg_score)} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Taxa: {sdr.answered_rate}%</span>
                  <span>{sdr.total_calls} chamadas</span>
                  <span>
                    {sdr.avg_score >= 85 ? '🟢 Excelente' :
                     sdr.avg_score >= 70 ? '🟡 Bom' : '🔴 Precisa melhorar'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
