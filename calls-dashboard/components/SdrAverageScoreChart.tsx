import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface SdrScoreRankingData {
  sdr_id: string;
  sdr_name: string;
  total_calls: number;        // total de ligações
  noted_calls: number;        // ligações com nota (análise)
  answered_calls: number;
  avg_score: number;          // média apenas das que têm nota
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

    // Buscar duas fontes em paralelo: totais e com notas
    const [{ data: totals, error: totalsErr }, { data: withNotes, error: notesErr }] = await Promise.all([
      supabase.rpc('get_sdr_metrics', { p_days: 99999 }),
      supabase.rpc('get_sdr_metrics_with_analysis', { p_days: 99999 })
    ]);

    if (totalsErr) {
      console.error('❌ Erro ao buscar totais dos SDRs:', totalsErr);
      return [];
    }
    if (notesErr) {
      console.error('❌ Erro ao buscar SDRs com notas:', notesErr);
      return [];
    }

    const totalsById = new Map<string, any>();
    (totals || []).forEach((row: any) => {
      totalsById.set(row.sdr_id, row);
    });

    // Montar resultado apenas para SDRs que têm notas
    const result: SdrScoreRankingData[] = (withNotes || [])
      .map((row: any) => {
        const cleanName = (row.sdr_name || '').replace(/^Usuário\s+/i, '').trim();
        const totalsRow = totalsById.get(row.sdr_id) || {};
        const totalCalls = Number(totalsRow.total_calls) || 0;
        const notedCalls = Number(row.total_calls) || 0; // na função with_analysis total_calls == com nota
        const answeredCalls = Number(totalsRow.answered_calls) || 0;
        const answeredRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
        return {
          sdr_id: row.sdr_id,
          sdr_name: cleanName,
          total_calls: totalCalls,
          noted_calls: notedCalls,
          answered_calls: answeredCalls,
          avg_score: Number(row.avg_score) || 0,
          answered_rate: answeredRate
        } as SdrScoreRankingData;
      })
      .filter(sdr => sdr.noted_calls > 0)
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 10);

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
        <p className="text-xs text-slate-500">Somente ligações com nota • Exibe Total vs Com Nota</p>
      </div>
      
      <div className="space-y-3">
        {chartData.map((sdr, index) => {
          const percentage = maxScore > 0 ? (sdr.avg_score / maxScore) * 100 : 0;
          
          // Cores baseadas na nota: Verde (8-10), Amarelo (6-7), Vermelho (<6)
          const getScoreColor = (score: number) => {
            if (score >= 8) return 'bg-emerald-500';
            if (score >= 6) return 'bg-yellow-500';
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
                    {sdr.avg_score.toFixed(1)}
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
                  <span>{sdr.total_calls} totais • {sdr.noted_calls} com nota</span>
                  <span>
                    {sdr.avg_score >= 8 ? '🟢 Excelente' :
                     sdr.avg_score >= 6 ? '🟡 Bom' : '🔴 Precisa melhorar'}
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
