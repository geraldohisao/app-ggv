import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

interface AuditData {
  source: 'dashboard' | 'rpc' | 'direct';
  totalCalls: number;
  answeredCalls: number;
  answeredRate: number;
  avgDuration: number;
  timestamp: Date;
  statusDistribution?: Record<string, number>;
}

interface RankingAuditData {
  source: 'rpc' | 'manual';
  volumeRanking: Array<{ sdr_name: string; total_calls: number }>;
  scoreRanking: Array<{ sdr_name: string; avg_score: number; noted_calls: number }>;
  leadsRanking: Array<{ sdr_name: string; unique_leads: number }>;
}

interface CallsDashboardAuditPanelProps {
  dashboardData: {
    totalCalls: number;
    answeredCalls: number;
    answeredRate: number;
    avgDuration: number;
  };
  selectedPeriod: number;
  selectedSdr: string | null;
  useCustomDates: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

type AuditTab = 'totals' | 'rate' | 'duration' | 'rankings' | 'debug';

const StatusBadge = ({ match }: { match: boolean }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
    match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }`}>
    {match ? 'OK' : 'DIVERGENTE'}
  </span>
);

const DataRow = ({ 
  label, 
  dashboardValue, 
  rpcValue, 
  directValue,
  format = 'number'
}: { 
  label: string; 
  dashboardValue: number; 
  rpcValue: number; 
  directValue: number;
  format?: 'number' | 'percent' | 'duration';
}) => {
  const formatValue = (value: number) => {
    if (format === 'percent') return `${value}%`;
    if (format === 'duration') {
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      return `${mins}m ${secs}s`;
    }
    return value.toLocaleString('pt-BR');
  };

  const tolerance = format === 'percent' ? 2 : format === 'duration' ? 10 : 5;
  const dashboardMatchesRpc = Math.abs(dashboardValue - rpcValue) <= tolerance;
  const rpcMatchesDirect = Math.abs(rpcValue - directValue) <= tolerance;
  const allMatch = dashboardMatchesRpc && rpcMatchesDirect;

  return (
    <tr className={`border-b ${!allMatch ? 'bg-red-50' : ''}`}>
      <td className="py-2 px-3 font-medium text-slate-700">{label}</td>
      <td className="py-2 px-3 text-center font-mono">{formatValue(dashboardValue)}</td>
      <td className="py-2 px-3 text-center font-mono">{formatValue(rpcValue)}</td>
      <td className="py-2 px-3 text-center font-mono">{formatValue(directValue)}</td>
      <td className="py-2 px-3 text-center">
        <StatusBadge match={allMatch} />
      </td>
    </tr>
  );
};

export default function CallsDashboardAuditPanel({
  dashboardData,
  selectedPeriod,
  selectedSdr,
  useCustomDates,
  startDate,
  endDate
}: CallsDashboardAuditPanelProps) {
  const { isAdminOrSuperAdmin } = useAdminPermissions();
  const [activeTab, setActiveTab] = useState<AuditTab>('totals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAudit, setLastAudit] = useState<Date | null>(null);
  
  // Audit data states
  const [rpcData, setRpcData] = useState<AuditData | null>(null);
  const [directData, setDirectData] = useState<AuditData | null>(null);
  const [rankingRpcData, setRankingRpcData] = useState<RankingAuditData | null>(null);
  const [rankingManualData, setRankingManualData] = useState<RankingAuditData | null>(null);

  // Calculate date range
  const getDateRange = useCallback(() => {
    if (useCustomDates && startDate && endDate) {
      return {
        startIso: new Date(startDate.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
        endIso: new Date(endDate.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString()
      };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - selectedPeriod + 1);
    return {
      startIso: new Date(start.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      endIso: new Date(end.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString()
    };
  }, [useCustomDates, startDate, endDate, selectedPeriod]);

  // Parse duration string to seconds
  const parseDurationToSeconds = (durationStr: string | null): number => {
    if (!durationStr || durationStr === '00:00:00') return 0;
    const parts = durationStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    return 0;
  };

  // For ranking RPCs, the backend uses a rolling window: NOW() - INTERVAL '1 day' * p_days
  // (not calendar-day boundaries). Use the same logic for the "manual" comparison to avoid
  // off-by-hours differences.
  const getRankingDateRange = useCallback(() => {
    if (useCustomDates && startDate && endDate) {
      return {
        startIso: new Date(startDate.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
        endIso: new Date(endDate.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString()
      };
    }

    const end = new Date();
    const start = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [useCustomDates, startDate, endDate, selectedPeriod]);

  // Fetch data from RPC (get_calls_with_filters)
  const fetchRpcData = useCallback(async () => {
    if (!supabase) return null;
    
    const { startIso, endIso } = getDateRange();
    // Use smaller page size to avoid Supabase row limits
    const pageSize = 1000;
    const maxRecords = 50000;
    let offset = 0;
    let allCalls: any[] = [];
    let totalCount = 0;

    while (offset < maxRecords) {
      const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_filters', {
        p_sdr: selectedSdr || null,
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

      if (callsError) throw callsError;

      const chunk = Array.isArray(callsData) ? callsData : [];
      const chunkSize = chunk.length;
      
      if (chunkSize === 0) break;

      totalCount = Number(chunk[0]?.total_count || totalCount);
      allCalls = allCalls.concat(chunk);

      // Stop if we've fetched all records
      if (allCalls.length >= totalCount) break;
      
      // Increment offset by the actual page size, not the requested limit
      offset += pageSize;
    }
    
    const answeredCalls = allCalls.filter(c => c.status_voip === 'normal_clearing').length;
    const answeredRate = totalCount > 0 ? Math.round((answeredCalls / totalCount) * 100) : 0;

    // status_voip distribution (used by Debug tab)
    const rpcStatusValues = new Map<string, number>();
    allCalls.forEach(c => {
      const status = c.status_voip || 'null';
      rpcStatusValues.set(status, (rpcStatusValues.get(status) || 0) + 1);
    });
    const statusDistribution = Object.fromEntries(rpcStatusValues);

    const answeredDurations = allCalls
      .filter(c => c.status_voip === 'normal_clearing')
      .map(c => {
        const formatted = c.duration_formated || c.duration_formatted;
        if (formatted && formatted !== '00:00:00') {
          return parseDurationToSeconds(formatted);
        }
        return Number(c.duration_seconds || c.duration || 0);
      })
      .filter(d => d > 0);

    const avgDuration = answeredDurations.length > 0
      ? Math.round(answeredDurations.reduce((sum, d) => sum + d, 0) / answeredDurations.length)
      : 0;

    return {
      source: 'rpc' as const,
      totalCalls: totalCount || allCalls.length,
      answeredCalls,
      answeredRate,
      avgDuration,
      timestamp: new Date(),
      statusDistribution
    };
  }, [selectedSdr, getDateRange]);

  // Fetch data directly from database with stable pagination (order is required)
  const fetchDirectData = useCallback(async () => {
    if (!supabase) return null;
    
    const { startIso, endIso } = getDateRange();
    
    // Fetch ALL records with pagination to get accurate counts
    const pageSize = 1000;
    let allCalls: any[] = [];
    let page = 0;
    let hasMore = true;
    let totalFromDb = 0;

    while (hasMore) {
      let query = supabase
        .from('calls')
        .select('id, status_voip, duration, duration_formated', { count: 'exact' })
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (selectedSdr) {
        query = query.ilike('agent_id', `%${selectedSdr}%`);
      }

      const { data: callsData, error: callsError, count } = await query;
      
      if (callsError) throw callsError;

      const calls = callsData || [];
      allCalls = allCalls.concat(calls);
      
      // Check if there are more records
      totalFromDb = count || 0;
      
      hasMore = allCalls.length < totalFromDb && calls.length === pageSize;
      page++;
      
      // Safety limit
      if (page > 100) break;
    }

    // Prefer DB exact count (avoid duplicates from unstable paging)
    const totalCalls = totalFromDb || allCalls.length;
    const answeredCalls = allCalls.filter(c => c.status_voip === 'normal_clearing').length;
    const answeredRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

    // status_voip distribution (used by Debug tab)
    const directStatusValues = new Map<string, number>();
    allCalls.forEach(c => {
      const status = c.status_voip || 'null';
      directStatusValues.set(status, (directStatusValues.get(status) || 0) + 1);
    });
    const statusDistribution = Object.fromEntries(directStatusValues);

    const answeredDurations = allCalls
      .filter(c => c.status_voip === 'normal_clearing')
      .map(c => {
        const formatted = c.duration_formated;
        if (formatted && formatted !== '00:00:00') {
          return parseDurationToSeconds(formatted);
        }
        return Number(c.duration || 0);
      })
      .filter(d => d > 0);

    const avgDuration = answeredDurations.length > 0
      ? Math.round(answeredDurations.reduce((sum, d) => sum + d, 0) / answeredDurations.length)
      : 0;

    return {
      source: 'direct' as const,
      totalCalls,
      answeredCalls,
      answeredRate,
      avgDuration,
      timestamp: new Date(),
      statusDistribution
    };
  }, [selectedSdr, getDateRange]);

  // Fetch ranking data from RPCs (rolling window). If custom date range is active,
  // compute the \"RPC\" side from get_calls_with_filters (same filter source as list)
  // because get_sdr_* functions do not accept start/end params.
  const fetchRankingRpcData = useCallback(async () => {
    if (!supabase) return null;

    if (useCustomDates && startDate && endDate) {
      // Use get_calls_with_filters for the selected custom range
      const { startIso, endIso } = getDateRange();
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

        if (callsError) throw callsError;

        const chunk = Array.isArray(callsData) ? callsData : [];
        if (chunk.length === 0) break;

        totalCount = Number(chunk[0]?.total_count || totalCount);
        allCalls = allCalls.concat(chunk);
        if (allCalls.length >= totalCount) break;
        offset += pageSize;
      }

      // Volume ranking: group by normalized group name (match dashboard normalization)
      const volumeMap = new Map<string, number>();
      allCalls.forEach((c: any) => {
        const name = normalizeSdrGroupName(String(c.sdr_name || c.agent_id || 'SDR'));
        const key = name.toLowerCase();
        volumeMap.set(key, (volumeMap.get(key) || 0) + 1);
      });
      const volumeRanking = Array.from(volumeMap.entries())
        .map(([key, count]) => ({ sdr_name: normalizeSdrGroupName(key), total_calls: count }))
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10);

      // Leads ranking
      const leadsMap = new Map<string, Set<string>>();
      const callsBySdrCalls = new Map<string, number>();
      allCalls.forEach((c: any) => {
        const dealId = String(c.deal_id || '').trim();
        if (!dealId) return;
        const name = normalizeSdrGroupName(String(c.sdr_name || c.agent_id || 'SDR'));
        const key = name.toLowerCase();
        if (!leadsMap.has(key)) leadsMap.set(key, new Set());
        leadsMap.get(key)!.add(dealId);
        callsBySdrCalls.set(key, (callsBySdrCalls.get(key) || 0) + 1);
      });
      const leadsRanking = Array.from(leadsMap.entries())
        .map(([key, leads]) => ({ sdr_name: normalizeSdrGroupName(key), unique_leads: leads.size }))
        .sort((a, b) => b.unique_leads - a.unique_leads)
        .slice(0, 10);

      // Score ranking: use call_analysis scores (final_grade) joined by call id
      const callIds = allCalls.map((c: any) => c.id).filter(Boolean);
      const scoreByCallId = new Map<string, number>();
      if (callIds.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < callIds.length; i += batchSize) {
          const batch = callIds.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('call_analysis')
            .select('call_id, final_grade')
            .in('call_id', batch);
          if (!error && data) {
            data.forEach((row: any) => {
              if (row.final_grade !== null && typeof row.final_grade === 'number') {
                scoreByCallId.set(row.call_id, row.final_grade);
              }
            });
          }
        }
      }

      const scoreAgg = new Map<string, { sum: number; count: number }>();
      allCalls.forEach((c: any) => {
        const score = scoreByCallId.get(c.id);
        if (score === undefined) return;
        const name = normalizeSdrGroupName(String(c.sdr_name || c.agent_id || 'SDR'));
        const key = name.toLowerCase();
        const cur = scoreAgg.get(key) || { sum: 0, count: 0 };
        scoreAgg.set(key, { sum: cur.sum + score, count: cur.count + 1 });
      });
      const scoreRanking = Array.from(scoreAgg.entries())
        .map(([key, v]) => ({
          sdr_name: normalizeSdrGroupName(key),
          avg_score: v.count > 0 ? Number((v.sum / v.count).toFixed(1)) : 0,
          noted_calls: v.count
        }))
        .sort((a, b) => b.avg_score - a.avg_score)
        .slice(0, 10);

      return {
        source: 'rpc' as const,
        volumeRanking,
        scoreRanking,
        leadsRanking
      };
    }

    const [volumeRes, scoreRes, leadsRes] = await Promise.all([
      supabase.rpc('get_sdr_metrics', { p_days: selectedPeriod }),
      supabase.rpc('get_sdr_metrics_with_analysis', { p_days: selectedPeriod }),
      supabase.rpc('get_sdr_unique_leads', { p_days: selectedPeriod })
    ]);

    if (volumeRes.error) console.error('Volume RPC error:', volumeRes.error);
    if (scoreRes.error) console.error('Score RPC error:', scoreRes.error);
    if (leadsRes.error) console.error('Leads RPC error:', leadsRes.error);

    return {
      source: 'rpc' as const,
      volumeRanking: (volumeRes.data || []).slice(0, 10).map((r: any) => ({
        sdr_name: r.sdr_name,
        total_calls: Number(r.total_calls)
      })),
      scoreRanking: (scoreRes.data || []).slice(0, 10).map((r: any) => ({
        sdr_name: r.sdr_name,
        avg_score: Number(r.avg_score) || 0,
        noted_calls: Number(r.total_calls) || 0
      })),
      leadsRanking: (leadsRes.data || []).slice(0, 10).map((r: any) => ({
        sdr_name: r.sdr_name,
        unique_leads: Number(r.unique_leads) || 0
      }))
    };
  }, [selectedPeriod, useCustomDates, startDate, endDate, getDateRange]);

  // Normalize SDR identifier (match RPC logic)
  const normalizeSdrEmail = (email?: string | null): string | null => {
    if (!email || typeof email !== 'string') return null;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.includes('@ggvinteligencia.com.br')) {
      return trimmed.replace('@ggvinteligencia.com.br', '@grupoggv.com');
    }
    return trimmed;
  };

  const normalizeSdrGroupName = (displayName: string): string => {
    const raw = (displayName || '').trim();
    if (!raw) return 'Sistema/Automático';
    const low = raw.toLowerCase();

    // Match backend normalization rules (see supabase/sql/95_fix_name_normalization.sql)
    if (low.includes('andressa')) return 'Andressa Habinoski';
    if (low.includes('camila') && low.includes('ataliba')) return 'Camila Ataliba';
    if (low.includes('ataliba')) return 'Camila Ataliba';
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
  };

  const formatSdrName = (agentId?: string | null): string => {
    const normalized = normalizeSdrEmail(agentId);
    if (!normalized) return 'Sistema/Automático';
    const base = normalized.split('@')[0].replace(/\./g, ' ');
    return base
      .replace(/^[0-9]+-/, '')
      .split(' ')
      .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
      .join(' ')
      .trim();
  };

  const getSdrKey = (agentId?: string | null): string => {
    return normalizeSdrEmail(agentId) || 'sistema/automatico';
  };

  // Fetch ranking data manually from calls
  const fetchRankingManualData = useCallback(async () => {
    if (!supabase) return null;

    const { startIso, endIso } = getRankingDateRange();

    // Get ALL calls for manual aggregation (paginate: Supabase returns ~1000 rows max per request)
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    let calls: any[] = [];
    let totalFromDb = 0;

    while (hasMore) {
      const { data: callsData, error, count } = await supabase
        .from('calls')
        .select('id, agent_id, status_voip, deal_id', { count: 'exact' })
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .not('agent_id', 'is', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      const chunk = callsData || [];
      calls = calls.concat(chunk);
      totalFromDb = count || totalFromDb;

      hasMore = chunk.length === pageSize && calls.length < totalFromDb;
      page += 1;

      // safety
      if (page > 200) break;
    }

    // Get scores from call_analysis table
    const callIds = calls.map(c => c.id);
    let analysisData: any[] = [];
    
    if (callIds.length > 0) {
      // Fetch in batches to avoid query size limits
      const batchSize = 500;
      for (let i = 0; i < callIds.length; i += batchSize) {
        const batch = callIds.slice(i, i + batchSize);
        const { data: batchAnalysis, error: analysisError } = await supabase
          .from('call_analysis')
          .select('call_id, final_grade')
          .in('call_id', batch);
        
        if (!analysisError && batchAnalysis) {
          analysisData = analysisData.concat(batchAnalysis);
        }
      }
    }

    // Create a map of call_id -> score
    const scoreByCallId = new Map<string, number>();
    analysisData.forEach(a => {
      if (a.final_grade !== null && typeof a.final_grade === 'number') {
        scoreByCallId.set(a.call_id, a.final_grade);
      }
    });

    // Manual volume aggregation
    const volumeMap = new Map<string, { name: string; count: number }>();
    calls.forEach(c => {
      // mimic backend filter: TRIM(agent_id) != ''
      const normalizedEmail = normalizeSdrEmail(c.agent_id);
      if (!normalizedEmail) return;

      const baseName = formatSdrName(c.agent_id);
      const name = normalizeSdrGroupName(baseName);
      const key = name.toLowerCase(); // backend groups by normalized_group_name
      const current = volumeMap.get(key) || { name, count: 0 };
      volumeMap.set(key, { name: current.name || name, count: current.count + 1 });
    });

    const volumeRanking = Array.from(volumeMap.entries())
      .map(([, value]) => ({ sdr_name: value.name, total_calls: value.count }))
      .sort((a, b) => b.total_calls - a.total_calls)
      .slice(0, 10);

    // Manual score aggregation (using scores from call_analysis)
    const scoreMap = new Map<string, { name: string; sum: number; count: number }>();
    calls.forEach(c => {
      const score = scoreByCallId.get(c.id);
      if (score !== undefined && typeof score === 'number') {
        const normalizedEmail = normalizeSdrEmail(c.agent_id);
        if (!normalizedEmail) return;

        const baseName = formatSdrName(c.agent_id);
        const name = normalizeSdrGroupName(baseName);
        const key = name.toLowerCase();
        const current = scoreMap.get(key) || { name, sum: 0, count: 0 };
        scoreMap.set(key, { name: current.name || name, sum: current.sum + score, count: current.count + 1 });
      }
    });

    const scoreRanking = Array.from(scoreMap.entries())
      .map(([, { name, sum, count }]) => ({
        sdr_name: name,
        avg_score: count > 0 ? Number((sum / count).toFixed(1)) : 0,
        noted_calls: count
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 10);

    // Manual leads aggregation
    const leadsMap = new Map<string, { name: string; leads: Set<string> }>();
    calls.forEach(c => {
      if (c.deal_id) {
        const normalizedEmail = normalizeSdrEmail(c.agent_id);
        if (!normalizedEmail) return;

        const baseName = formatSdrName(c.agent_id);
        const name = normalizeSdrGroupName(baseName);
        const key = name.toLowerCase();
        if (!leadsMap.has(key)) leadsMap.set(key, { name, leads: new Set() });
        const dealId = String(c.deal_id).trim();
        if (dealId) leadsMap.get(key)!.leads.add(dealId);
      }
    });

    const leadsRanking = Array.from(leadsMap.entries())
      .map(([, value]) => ({ sdr_name: value.name, unique_leads: value.leads.size }))
      .sort((a, b) => b.unique_leads - a.unique_leads)
      .slice(0, 10);

    return {
      source: 'manual' as const,
      volumeRanking,
      scoreRanking,
      leadsRanking
    };
  }, [getRankingDateRange]);

  // Run full audit
  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const errors: string[] = [];
    
    // Run each query separately to capture individual errors
    try {
      const rpc = await fetchRpcData();
      setRpcData(rpc);
    } catch (err: any) {
      console.error('Audit RPC error:', err);
      errors.push(`RPC: ${err.message}`);
    }

    try {
      const direct = await fetchDirectData();
      setDirectData(direct);
    } catch (err: any) {
      console.error('Audit Direct error:', err);
      errors.push(`Direct: ${err.message}`);
    }

    try {
      const rankingRpc = await fetchRankingRpcData();
      setRankingRpcData(rankingRpc);
    } catch (err: any) {
      console.error('Audit Ranking RPC error:', err);
      errors.push(`Ranking RPC: ${err.message}`);
    }

    try {
      const rankingManual = await fetchRankingManualData();
      setRankingManualData(rankingManual);
    } catch (err: any) {
      console.error('Audit Ranking Manual error:', err);
      errors.push(`Ranking Manual: ${err.message}`);
    }

    if (errors.length > 0) {
      setError(errors.join(' | '));
    }
    
    setLastAudit(new Date());
    setLoading(false);
  }, [fetchRpcData, fetchDirectData, fetchRankingRpcData, fetchRankingManualData]);

  // Auto-run audit on mount and when filters change
  useEffect(() => {
    if (isAdminOrSuperAdmin) {
      runAudit();
    }
  }, [isAdminOrSuperAdmin, selectedPeriod, selectedSdr, useCustomDates, startDate, endDate]);

  if (!isAdminOrSuperAdmin) {
    return null;
  }

  const tabs: { id: AuditTab; label: string }[] = [
    { id: 'totals', label: 'Totais' },
    { id: 'rate', label: 'Taxa' },
    { id: 'duration', label: 'Duracao' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'debug', label: 'Debug' }
  ];

  return (
    <div className="bg-white border border-amber-200 rounded-lg shadow-sm mt-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <h3 className="font-semibold text-amber-800">Painel de Auditoria</h3>
          {lastAudit && (
            <span className="text-xs text-amber-600">
              Ultima verificacao: {lastAudit.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            loading
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {loading ? 'Verificando...' : 'Executar Auditoria'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-700 bg-amber-50'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mb-2"></div>
            <p>Verificando dados...</p>
          </div>
        ) : (
          <>
            {/* Totals Tab */}
            {activeTab === 'totals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="py-2 px-3 text-left">Metrica</th>
                      <th className="py-2 px-3 text-center">Dashboard</th>
                      <th className="py-2 px-3 text-center">RPC</th>
                      <th className="py-2 px-3 text-center">Banco Direto</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DataRow
                      label="Total de Chamadas"
                      dashboardValue={dashboardData.totalCalls}
                      rpcValue={rpcData?.totalCalls || 0}
                      directValue={directData?.totalCalls || 0}
                    />
                    <DataRow
                      label="Chamadas Atendidas"
                      dashboardValue={dashboardData.answeredCalls}
                      rpcValue={rpcData?.answeredCalls || 0}
                      directValue={directData?.answeredCalls || 0}
                    />
                  </tbody>
                </table>
              </div>
            )}

            {/* Rate Tab */}
            {activeTab === 'rate' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="py-2 px-3 text-left">Metrica</th>
                      <th className="py-2 px-3 text-center">Dashboard</th>
                      <th className="py-2 px-3 text-center">RPC</th>
                      <th className="py-2 px-3 text-center">Banco Direto</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DataRow
                      label="Taxa de Atendimento"
                      dashboardValue={dashboardData.answeredRate}
                      rpcValue={rpcData?.answeredRate || 0}
                      directValue={directData?.answeredRate || 0}
                      format="percent"
                    />
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">
                  <strong>Calculo:</strong> (Chamadas Atendidas / Total de Chamadas) * 100
                  <br />
                  <strong>Criterio:</strong> status_voip = 'normal_clearing'
                </div>
              </div>
            )}

            {/* Duration Tab */}
            {activeTab === 'duration' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="py-2 px-3 text-left">Metrica</th>
                      <th className="py-2 px-3 text-center">Dashboard</th>
                      <th className="py-2 px-3 text-center">RPC</th>
                      <th className="py-2 px-3 text-center">Banco Direto</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DataRow
                      label="Duracao Media (Atendidas)"
                      dashboardValue={dashboardData.avgDuration}
                      rpcValue={rpcData?.avgDuration || 0}
                      directValue={directData?.avgDuration || 0}
                      format="duration"
                    />
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">
                  <strong>Calculo:</strong> Media de duracao apenas das chamadas atendidas
                  <br />
                  <strong>Fonte:</strong> duration_formated (HH:MM:SS) ou duration (segundos)
                </div>
              </div>
            )}

            {/* Rankings Tab */}
            {activeTab === 'rankings' && (
              <div className="space-y-6">
                {/* Volume Ranking */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Ranking por Volume</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via RPC (get_sdr_metrics)</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingRpcData?.volumeRanking.map((r, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>#{i + 1} {r.sdr_name}</span>
                            <span className="font-mono">{r.total_calls}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via Agregacao Manual</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingManualData?.volumeRanking.map((r, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>#{i + 1} {r.sdr_name}</span>
                            <span className="font-mono">{r.total_calls}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Ranking */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Ranking por Nota Media</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via RPC (get_sdr_metrics_with_analysis)</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingRpcData?.scoreRanking.length === 0 ? (
                          <div className="text-slate-400">Sem dados</div>
                        ) : (
                          rankingRpcData?.scoreRanking.map((r, i) => (
                            <div key={i} className="flex justify-between py-0.5">
                              <span>#{i + 1} {r.sdr_name}</span>
                              <span className="font-mono">{r.avg_score.toFixed(1)} ({r.noted_calls})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via Agregacao Manual</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingManualData?.scoreRanking.length === 0 ? (
                          <div className="text-slate-400">Sem dados</div>
                        ) : (
                          rankingManualData?.scoreRanking.map((r, i) => (
                            <div key={i} className="flex justify-between py-0.5">
                              <span>#{i + 1} {r.sdr_name}</span>
                              <span className="font-mono">{r.avg_score.toFixed(1)} ({r.noted_calls})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leads Ranking */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Ranking por Leads Unicos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via RPC (get_sdr_unique_leads)</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingRpcData?.leadsRanking.map((r, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>#{i + 1} {r.sdr_name}</span>
                            <span className="font-mono">{r.unique_leads}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Via Agregacao Manual</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-40 overflow-y-auto">
                        {rankingManualData?.leadsRanking.map((r, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>#{i + 1} {r.sdr_name}</span>
                            <span className="font-mono">{r.unique_leads}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Tab */}
            {activeTab === 'debug' && (
              <div className="space-y-6">
                {/* Status VOIP Distribution */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Distribuicao de status_voip</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Comparacao dos valores de status_voip entre RPC e Banco Direto.
                    Chamadas "atendidas" sao aquelas com status_voip = "normal_clearing".
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1 font-semibold">Via RPC (get_calls_with_filters)</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-60 overflow-y-auto">
                        {rpcData?.statusDistribution ? (
                          Object.entries(rpcData.statusDistribution)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([status, count], i) => (
                              <div key={i} className={`flex justify-between py-0.5 ${status === 'normal_clearing' ? 'bg-green-100 px-1 rounded font-semibold' : ''}`}>
                                <span>{status}</span>
                                <span className="font-mono">{count as number}</span>
                              </div>
                            ))
                        ) : (
                          <div className="text-slate-400">Sem dados</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 font-semibold">Via Banco Direto</div>
                      <div className="bg-slate-50 rounded p-2 text-xs max-h-60 overflow-y-auto">
                        {directData?.statusDistribution ? (
                          Object.entries(directData.statusDistribution)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([status, count], i) => (
                              <div key={i} className={`flex justify-between py-0.5 ${status === 'normal_clearing' ? 'bg-green-100 px-1 rounded font-semibold' : ''}`}>
                                <span>{status}</span>
                                <span className="font-mono">{count as number}</span>
                              </div>
                            ))
                        ) : (
                          <div className="text-slate-400">Sem dados</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                {rpcData?.statusDistribution && directData?.statusDistribution && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <h5 className="font-medium text-amber-800 mb-2">Diagnostico</h5>
                    <div className="text-xs text-amber-700 space-y-1">
                      <p>
                        <strong>normal_clearing (RPC):</strong> {rpcData.statusDistribution['normal_clearing'] || 0}
                      </p>
                      <p>
                        <strong>normal_clearing (Banco):</strong> {directData.statusDistribution['normal_clearing'] || 0}
                      </p>
                      <p>
                        <strong>Diferenca:</strong> {(directData.statusDistribution['normal_clearing'] || 0) - (rpcData.statusDistribution['normal_clearing'] || 0)} chamadas
                      </p>
                      {(directData.statusDistribution['normal_clearing'] || 0) > (rpcData.statusDistribution['normal_clearing'] || 0) && (
                        <p className="mt-2 text-red-600">
                          ⚠️ O banco direto retorna mais chamadas "normal_clearing" que o RPC.
                          Isso pode indicar que o RPC tem filtros adicionais ou que registros diferentes estao sendo retornados.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with summary */}
      {!loading && rpcData && directData && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <strong>Periodo:</strong>{' '}
              {useCustomDates && startDate && endDate
                ? `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`
                : `Ultimos ${selectedPeriod} dias`}
              {selectedSdr && <span className="ml-2">| <strong>SDR:</strong> {selectedSdr}</span>}
            </div>
            <div className="flex items-center gap-4">
              <span>
                Dashboard: <span className="font-mono">{dashboardData.totalCalls}</span>
              </span>
              <span>
                RPC: <span className="font-mono">{rpcData.totalCalls}</span>
              </span>
              <span>
                Banco: <span className="font-mono">{directData.totalCalls}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
