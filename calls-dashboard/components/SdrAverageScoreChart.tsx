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
  startDate?: string;
  endDate?: string;
}

function normalizeSdrGroupName(nameRaw: string): string {
  const raw = (nameRaw || '').trim();
  if (!raw) return 'Sistema/Automático';
  const low = raw.toLowerCase();

  if (low.includes('djiovane')) return 'Djiovane Santos';
  if (low.includes('andressa')) return 'Andressa Habinoski';
  if ((low.includes('camila') && low.includes('ataliba')) || low.includes('ataliba')) return 'Camila Ataliba';
  if (low.includes('ruama') || low.includes('lô') || low.includes('lo-ruama') || low.includes('lo ruama')) return 'Lô-Ruama Oliveira';
  if (low.includes('mariana')) return 'Mariana Costa';
  if (low.includes('isabel')) return 'Isabel Pestilho';
  if (low.includes('barbara') || low.includes('bárbara')) return 'Barbara Rabech';
  if (low.includes('rafael')) return 'Rafael Garcia';
  if (low.includes('geraldo')) return 'Geraldo Hisao';
  if (low.includes('cesar') || low.includes('césar')) return 'César Intrieri';
  if (low.includes('danilo')) return 'Tarcis Danilo';
  if (low.includes('samuel')) return 'Samuel Bueno';
  if (low.includes('victor') || low.includes('vitor')) return 'Victor Hernandes';

  return raw;
}

function mergeScoreRankingByName(rows: SdrScoreRankingData[]): SdrScoreRankingData[] {
  const map = new Map<string, { name: string; total_calls: number; noted_calls: number; answered_calls: number; scoreSumWeighted: number }>();

  for (const r of rows) {
    const normName = normalizeSdrGroupName(r.sdr_name);
    const key = normName.toLowerCase();
    const noted = Number(r.noted_calls) || 0;
    const score = Number(r.avg_score) || 0;
    const cur = map.get(key) || { name: normName, total_calls: 0, noted_calls: 0, answered_calls: 0, scoreSumWeighted: 0 };
    cur.total_calls += Number(r.total_calls) || 0;
    cur.answered_calls += Number(r.answered_calls) || 0;
    cur.noted_calls += noted;
    cur.scoreSumWeighted += score * noted;
    map.set(key, cur);
  }

  return Array.from(map.values()).map(v => {
    const avgScore = v.noted_calls > 0 ? Number((v.scoreSumWeighted / v.noted_calls).toFixed(1)) : 0;
    const answeredRate = v.total_calls > 0 ? Math.round((v.answered_calls / v.total_calls) * 100) : 0;
    return {
      sdr_id: v.name.toLowerCase(),
      sdr_name: v.name,
      total_calls: v.total_calls,
      noted_calls: v.noted_calls,
      answered_calls: v.answered_calls,
      avg_score: avgScore,
      answered_rate: answeredRate
    };
  });
}

// Função para buscar dados de ranking por nota média (apenas usuários ativos)
async function fetchSdrScoreRankingData(days: number = 30, startDate?: string, endDate?: string): Promise<SdrScoreRankingData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    const useCustomRange = !!(startDate && endDate);
    console.log('🔍 Buscando dados de ranking por nota média:', { days, startDate, endDate, useCustomRange });

    if (useCustomRange) {
      const startIso = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const endIso = new Date(endDate + 'T23:59:59.999Z').toISOString();
      const pageSize = 1000;
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
          p_limit: pageSize,
          p_offset: offset,
          p_sort_by: 'created_at',
          p_min_duration: null,
          p_max_duration: null,
          p_min_score: null
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
        offset += pageSize;
      }

      if (allCalls.length === 0) {
        console.log('📭 Nenhuma chamada encontrada no período personalizado');
        return [];
      }

      if (totalCount > maxRecords) {
        console.warn('⚠️ Limite máximo atingido no período personalizado. Dados podem estar incompletos.');
      }

      const sdrMap = new Map<string, SdrScoreRankingData & { scoreSum: number }>();
      allCalls.forEach((call: any) => {
        const sdrNameRaw = String(call.sdr_name || call.agent_id || 'SDR');
        const sdrName = normalizeSdrGroupName(sdrNameRaw);
        const key = sdrName.toLowerCase();
        const score = typeof call.score === 'number' ? call.score : null;

        if (!sdrMap.has(key)) {
          sdrMap.set(key, {
            sdr_id: key,
            sdr_name: String(sdrName),
            total_calls: 0,
            noted_calls: 0,
            answered_calls: 0,
            avg_score: 0,
            answered_rate: 0,
            scoreSum: 0
          });
        }

        const item = sdrMap.get(key)!;
        item.total_calls += 1;
        if (call.status_voip === 'normal_clearing') {
          item.answered_calls += 1;
        }
        if (score !== null) {
          item.noted_calls += 1;
          item.scoreSum += score;
        }
      });

      let result = Array.from(sdrMap.values())
        .map((item) => ({
          sdr_id: item.sdr_id,
          sdr_name: item.sdr_name,
          total_calls: item.total_calls,
          noted_calls: item.noted_calls,
          answered_calls: item.answered_calls,
          avg_score: item.noted_calls > 0 ? Number((item.scoreSum / item.noted_calls).toFixed(1)) : 0,
          answered_rate: item.total_calls > 0 ? Math.round((item.answered_calls / item.total_calls) * 100) : 0
        }))
        .filter((sdr) => sdr.noted_calls > 0);

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
          result = Array.from(sdrMap.values())
            .map((item) => ({
              sdr_id: item.sdr_id,
              sdr_name: item.sdr_name,
              total_calls: item.total_calls,
              noted_calls: item.noted_calls,
              answered_calls: item.answered_calls,
              avg_score: item.noted_calls > 0 ? Number((item.scoreSum / item.noted_calls).toFixed(1)) : 0,
              answered_rate: item.total_calls > 0 ? Math.round((item.answered_calls / item.total_calls) * 100) : 0
            }))
            .filter((sdr) => sdr.noted_calls > 0);
        }
      }

      result = mergeScoreRankingByName(result);
      return result.sort((a, b) => b.avg_score - a.avg_score).slice(0, 10);
    }

    // Buscar métricas primeiro (período relativo)
    const [
      { data: totals, error: totalsErr }, 
      { data: withNotes, error: notesErr }
    ] = await Promise.all([
      supabase.rpc('get_sdr_metrics', { p_days: days }),
      supabase.rpc('get_sdr_metrics_with_analysis', { p_days: days })
    ]);

    if (totalsErr) {
      console.error('❌ Erro ao buscar totais dos SDRs:', totalsErr);
      return [];
    }
    if (notesErr) {
      console.error('❌ Erro ao buscar SDRs com notas:', notesErr);
      return [];
    }

    if (!withNotes || withNotes.length === 0) {
      console.log('📭 Nenhum SDR com nota encontrado na RPC');
      return [];
    }

    console.log('✅ SDRs com notas carregados:', withNotes.length);
    console.log('🔍 SDRs com notas:', withNotes.map((d: any) => ({ id: d.sdr_id, name: d.sdr_name, score: d.avg_score })));

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

    const totalsById = new Map<string, any>();
    (totals || []).forEach((row: any) => {
      totalsById.set(row.sdr_id, row);
    });

    // Montar resultado
    let result: SdrScoreRankingData[] = (withNotes || [])
      .map((row: any) => {
        const cleanName = (row.sdr_name || '').replace(/^Usuário\s+/i, '').trim();
        const totalsRow = totalsById.get(row.sdr_id) || {};
        const totalCalls = Number(totalsRow.total_calls) || 0;
        const notedCalls = Number(row.total_calls) || 0;
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
      .filter(sdr => sdr.noted_calls > 0);

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
        result = (withNotes || [])
          .map((row: any) => {
            const cleanName = (row.sdr_name || '').replace(/^Usuário\s+/i, '').trim();
            const totalsRow = totalsById.get(row.sdr_id) || {};
            const totalCalls = Number(totalsRow.total_calls) || 0;
            const notedCalls = Number(row.total_calls) || 0;
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
          .filter(sdr => sdr.noted_calls > 0);
      }
    }

    // Unificar duplicados por nome normalizado e limitar a top 10
    result = mergeScoreRankingByName(result)
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 10);

    console.log('📊 Ranking por nota final:', result.length, 'SDRs');
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados de SDRs por nota:', error);
    return [];
  }
}

export default function SdrAverageScoreChart({ selectedPeriod = 30, startDate, endDate }: SdrAverageScoreChartProps) {
  const [chartData, setChartData] = useState<SdrScoreRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const rankingData = await fetchSdrScoreRankingData(selectedPeriod, startDate, endDate);
        setChartData(rankingData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados de ranking por nota:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, startDate, endDate]);

  // Listener para novas análises em tempo real
  useEffect(() => {
    console.log('🔄 Configurando listener de tempo real para call_analysis...');
    
    const channel = supabase
      .channel('ranking_analysis_updates')
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'call_analysis' 
        }, 
        (payload) => {
          console.log('🔔 Nova análise detectada! Recarregando ranking...', payload);
          
          // Pequeno delay para garantir que dados foram commitados
          setTimeout(async () => {
            setLoading(true);
            try {
              const rankingData = await fetchSdrScoreRankingData(selectedPeriod);
              setChartData(rankingData);
              console.log('✅ Ranking atualizado em tempo real!');
            } catch (err) {
              console.error('❌ Erro ao atualizar ranking em tempo real:', err);
            } finally {
              setLoading(false);
            }
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo listener de análises...');
      supabase.removeChannel(channel);
    };
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

  // Calcular totais para exibição
  const totalNoted = chartData.reduce((sum, sdr) => sum + sdr.noted_calls, 0);
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
        <h3 className="font-semibold text-slate-800">⭐ Ranking por Nota Média</h3>
        <p className="text-xs text-slate-500">
          {getPeriodText()} • {totalNoted.toLocaleString('pt-BR')} avaliadas de {totalCalls.toLocaleString('pt-BR')} totais
        </p>
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
