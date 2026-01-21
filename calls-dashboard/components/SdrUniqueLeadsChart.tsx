import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface SdrUniqueLeadsData {
  sdr_id: string;
  sdr_name: string;
  unique_leads: number;
  total_calls: number;
}

interface SdrUniqueLeadsChartProps {
  selectedPeriod?: number;
  startDate?: string;
  endDate?: string;
}

async function fetchSdrUniqueLeads(
  days: number = 30,
  startDate?: string,
  endDate?: string
): Promise<SdrUniqueLeadsData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    const useCustomRange = !!(startDate && endDate);
    console.log('🔍 Buscando ranking de leads únicos:', { days, startDate, endDate, useCustomRange });

    let result: SdrUniqueLeadsData[] = [];
    let rawResult: SdrUniqueLeadsData[] = [];

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

      const sdrLeadMap = new Map<string, { sdr_id: string; sdr_name: string; leads: Set<string>; total_calls: number }>();
      allCalls.forEach((call: any) => {
        const dealId = call.deal_id;
        if (!dealId) return;

        const sdrId = call.sdr_id || call.agent_id || 'desconhecido';
        const sdrName = call.sdr_name || call.agent_id || 'SDR';
        const key = String(sdrId).toLowerCase();

        if (!sdrLeadMap.has(key)) {
          sdrLeadMap.set(key, { sdr_id: String(sdrId), sdr_name: String(sdrName), leads: new Set(), total_calls: 0 });
        }

        const item = sdrLeadMap.get(key)!;
        item.leads.add(String(dealId));
        item.total_calls += 1;
      });

      result = Array.from(sdrLeadMap.values()).map((item) => ({
        sdr_id: item.sdr_id,
        sdr_name: item.sdr_name,
        unique_leads: item.leads.size,
        total_calls: item.total_calls
      }));
      rawResult = result.slice();
    } else {
      const { data, error } = await supabase.rpc('get_sdr_unique_leads', { p_days: days });
      if (error) {
        console.error('❌ Erro ao buscar leads únicos:', error);
        return [];
      }
      result = (data || []).map((row: any) => ({
        sdr_id: row.sdr_id,
        sdr_name: row.sdr_name,
        unique_leads: Number(row.unique_leads) || 0,
        total_calls: Number(row.total_calls) || 0
      }));
      rawResult = result.slice();
    }

    // Filtrar por usuários ativos (se conseguimos a lista)
    let activeUsernames: Set<string> = new Set();
    try {
      const { data: activeProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('email, is_active')
        .eq('is_active', true);

      if (profilesErr) {
        console.warn('⚠️ Erro ao buscar perfis ativos:', profilesErr);
      } else if (activeProfiles && activeProfiles.length > 0) {
        activeUsernames = new Set(
          activeProfiles.map((p: any) => {
            const email = p.email?.toLowerCase() || '';
            return email.split('@')[0];
          }).filter(Boolean)
        );
      }
    } catch (profileErr) {
      console.warn('⚠️ Exceção ao buscar perfis:', profileErr);
    }

    if (activeUsernames.size > 0) {
      const beforeFilter = result.length;
      result = result.filter((sdr) => {
        const sdrUsername = (sdr.sdr_id?.toLowerCase() || '').split('@')[0];
        return activeUsernames.has(sdrUsername);
      });

      if (result.length === 0 && beforeFilter > 0) {
        console.warn('⚠️ Todos os SDRs filtrados por ativo. Usando fallback sem filtro.');
        result = rawResult;
      }
    }

    return result.sort((a, b) => b.unique_leads - a.unique_leads).slice(0, 10);
  } catch (error) {
    console.error('❌ Erro geral ao buscar ranking de leads únicos:', error);
    return [];
  }
}

export default function SdrUniqueLeadsChart({
  selectedPeriod = 30,
  startDate,
  endDate
}: SdrUniqueLeadsChartProps) {
  const [chartData, setChartData] = useState<SdrUniqueLeadsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const rankingData = await fetchSdrUniqueLeads(selectedPeriod, startDate, endDate);
        setChartData(rankingData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar ranking de leads únicos:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, startDate, endDate]);

  const getPeriodText = () => {
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    return `Últimos ${selectedPeriod} dias`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">🎯 Ranking por Leads Únicos</h3>
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
          <h3 className="font-semibold text-slate-800">🎯 Ranking por Leads Únicos</h3>
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
          <h3 className="font-semibold text-slate-800">🎯 Ranking por Leads Únicos</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Nenhum dado disponível</div>
        </div>
      </div>
    );
  }

  const maxLeads = Math.max(...chartData.map(d => d.unique_leads));
  const totalUniqueLeads = chartData.reduce((sum, sdr) => sum + sdr.unique_leads, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">🎯 Ranking por Leads Únicos</h3>
        <p className="text-xs text-slate-500">
          {getPeriodText()} • {totalUniqueLeads.toLocaleString('pt-BR')} leads únicos no período
        </p>
      </div>

      <div className="space-y-3">
        {chartData.map((sdr, index) => {
          const percentage = maxLeads > 0 ? (sdr.unique_leads / maxLeads) * 100 : 0;
          return (
            <div key={sdr.sdr_id} className="flex items-center gap-3">
              <div className="w-6 text-sm font-medium text-slate-500">
                #{index + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-slate-800">{sdr.sdr_name}</div>
                  <div className="text-sm text-slate-600">
                    {sdr.unique_leads} leads
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Média: {sdr.unique_leads > 0 ? (sdr.total_calls / sdr.unique_leads).toFixed(1) : '0.0'} ligações/lead
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
