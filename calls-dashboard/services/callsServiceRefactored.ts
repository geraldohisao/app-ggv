import { supabase } from '../../services/supabaseClient';
import { CallItem, SdrUser } from '../types';

// =========================================
// INTERFACES PARA O NOVO SISTEMA
// =========================================

export interface DashboardMetrics {
  totalCalls: number;
  answeredCalls: number;
  answeredRate: number;
  avgDuration: number;
  totalSdrs: number;
  periodStart: string;
  periodEnd: string;
}

export interface CallWithDetails {
  id: string;
  provider_call_id: string;
  deal_id: string;
  company_name: string;
  person_name: string;
  person_email: string;
  sdr_id: string;
  sdr_name: string;
  sdr_email: string;
  sdr_avatar_url: string;
  status: string;
  duration: number;
  call_type: string;
  direction: string;
  recording_url: string;
  audio_bucket: string;
  audio_path: string;
  audio_url: string;
  transcription: string;
  transcript_status: string;
  ai_status: string;
  insights: any;
  scorecard: any;
  score: number;
  from_number: string;
  to_number: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  processed_at: string;
  total_count: number;
  // Campos extras para detalhes
  comments?: any[];
  detailed_scores?: any[];
}

export interface CallsFilters {
  sdr_email?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CallsResponse {
  calls: CallWithDetails[];
  totalCount: number;
  hasMore: boolean;
}

export interface SdrStats extends SdrUser {
  lastCallDate: string;
  avgDuration: number;
  successRate: number;
}

export interface ChartDataPoint {
  date: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
}

export interface SdrScoreData {
  sdrName: string;
  avgScore: number;
  callCount: number;
  scoreTrend: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

// =========================================
// SERVIÇOS PRINCIPAIS
// =========================================

/**
 * Busca métricas do dashboard
 */
export async function fetchDashboardMetrics(days: number = 14): Promise<DashboardMetrics> {
  try {
    console.log(`🔍 CALLS SERVICE - Buscando métricas do dashboard (${days} dias)...`);

    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_days: days
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar métricas:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhuma métrica encontrada');
      return {
        totalCalls: 0,
        answeredCalls: 0,
        answeredRate: 0,
        avgDuration: 0,
        totalSdrs: 0,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString()
      };
    }

    const metrics = data[0];
    console.log('✅ CALLS SERVICE - Métricas carregadas:', metrics);

    return {
      totalCalls: metrics.total_calls || 0,
      answeredCalls: metrics.answered_calls || 0,
      answeredRate: metrics.answered_rate || 0,
      avgDuration: metrics.avg_duration || 0,
      totalSdrs: metrics.total_sdrs || 0,
      periodStart: metrics.period_start,
      periodEnd: metrics.period_end
    };

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar métricas:', error);
    throw error;
  }
}

/**
 * Busca calls com filtros avançados
 */
export async function fetchCallsWithFilters(filters: CallsFilters = {}): Promise<CallsResponse> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando calls com filtros:', filters);

    const {
      sdr_email,
      status,
      start_date,
      end_date,
      search,
      limit = 50,
      offset = 0
    } = filters;

    // Converter datas para timestamp se fornecidas
    const startTimestamp = start_date ? new Date(start_date).toISOString() : null;
    const endTimestamp = end_date ? new Date(end_date).toISOString() : null;

    const { data, error } = await supabase.rpc('get_calls_with_filters', {
      p_limit: limit,
      p_offset: offset,
      p_sdr_email: sdr_email || null,
      p_status: status || null,
      p_start_date: startTimestamp,
      p_end_date: endTimestamp,
      p_search: search || null
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar calls:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhuma call encontrada');
      return {
        calls: [],
        totalCount: 0,
        hasMore: false
      };
    }

    const totalCount = data[0]?.total_count || 0;
    const hasMore = offset + limit < totalCount;

    console.log(`✅ CALLS SERVICE - ${data.length} calls encontradas (${totalCount} total)`);

    return {
      calls: data,
      totalCount,
      hasMore
    };

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado:', error);
    throw error;
  }
}

/**
 * Busca detalhes completos de uma call
 */
export async function fetchCallDetails(callId: string): Promise<CallWithDetails | null> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando detalhes da call:', callId);

    const { data, error } = await supabase.rpc('get_call_details', {
      p_call_id: callId
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar detalhes da call:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Call não encontrada');
      return null;
    }

    console.log('✅ CALLS SERVICE - Detalhes da call encontrados');
    return data[0];

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar detalhes:', error);
    throw error;
  }
}

/**
 * Busca lista de SDRs únicos com estatísticas (apenas usuários ativos)
 */
export async function fetchUniqueSdrsWithStats(): Promise<SdrStats[]> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando SDRs únicos com estatísticas (apenas ativos)');

    // Buscar em paralelo: SDRs das chamadas e usuários ativos
    const [sdrsResult, profilesResult] = await Promise.all([
      supabase.rpc('get_unique_sdrs'),
      supabase.from('profiles').select('email, is_active').eq('is_active', true)
    ]);

    const { data, error } = sdrsResult;
    const { data: activeProfiles, error: profilesError } = profilesResult;

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar SDRs:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhum SDR encontrado');
      return [];
    }

    // Criar Set de usernames ativos (parte antes do @) para filtro flexível
    // Isso resolve problemas de domínios diferentes (@grupoggv.com vs @ggvinteligencia.com.br)
    const activeUsernames = new Set(
      (activeProfiles || []).map((p: any) => {
        const email = p.email?.toLowerCase() || '';
        return email.split('@')[0];
      }).filter(Boolean)
    );

    // Filtrar apenas SDRs que estão ativos no sistema
    const sdrs: SdrStats[] = data
      .filter((sdr: any) => {
        const sdrUsername = (sdr.sdr_email?.toLowerCase() || '').split('@')[0];
        return activeUsernames.has(sdrUsername);
      })
      .map((sdr: any) => ({
        id: sdr.sdr_email,
        name: sdr.sdr_name,
        email: sdr.sdr_email,
        avatarUrl: sdr.sdr_avatar_url,
        callCount: sdr.call_count,
        lastCallDate: sdr.last_call_date,
        avgDuration: sdr.avg_duration || 0,
        successRate: sdr.success_rate || 0
      }));

    console.log(`✅ CALLS SERVICE - ${sdrs.length} SDRs ativos encontrados (de ${data.length} total)`);
    return sdrs;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar SDRs:', error);
    throw error;
  }
}

/**
 * Busca dados para gráfico de volume de chamadas
 */
export async function fetchCallVolumeChart(days: number = 14): Promise<ChartDataPoint[]> {
  try {
    console.log(`🔍 CALLS SERVICE - Buscando dados de volume (${days} dias)...`);

    const { data, error } = await supabase.rpc('get_call_volume_chart', {
      p_days: days
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar dados de volume:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhum dado de volume encontrado');
      return [];
    }

    const chartData: ChartDataPoint[] = data.map((point: any) => ({
      date: point.date,
      totalCalls: point.total_calls || 0,
      answeredCalls: point.answered_calls || 0,
      missedCalls: point.missed_calls || 0
    }));

    console.log(`✅ CALLS SERVICE - ${chartData.length} pontos de dados carregados`);
    return chartData;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar dados de volume:', error);
    throw error;
  }
}

/**
 * Busca dados para gráfico de scores por SDR
 */
export async function fetchSdrScoreChart(days: number = 14): Promise<SdrScoreData[]> {
  try {
    console.log(`🔍 CALLS SERVICE - Buscando dados de score por SDR (${days} dias)...`);

    const { data, error } = await supabase.rpc('get_sdr_score_chart', {
      p_days: days
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar dados de score:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhum dado de score encontrado');
      return [];
    }

    const scoreData: SdrScoreData[] = data.map((sdr: any) => ({
      sdrName: sdr.sdr_name,
      avgScore: sdr.avg_score || 0,
      callCount: sdr.call_count || 0,
      scoreTrend: sdr.score_trend || 'needs_improvement'
    }));

    console.log(`✅ CALLS SERVICE - ${scoreData.length} SDRs com scores carregados`);
    return scoreData;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar dados de score:', error);
    throw error;
  }
}

// =========================================
// FUNÇÕES DE COMPATIBILIDADE
// =========================================

/**
 * Converte CallWithDetails para CallItem (compatibilidade com frontend existente)
 */
export function convertToCallItem(call: CallWithDetails): CallItem {
  return {
    id: call.id,
    company: call.company_name,
    dealCode: call.deal_id || `CALL-${call.id.slice(0, 8)}`,
    sdr: {
      id: call.sdr_email || call.sdr_id,
      name: call.sdr_name,
      email: call.sdr_email,
      avatarUrl: call.sdr_avatar_url
    },
    date: call.created_at,
    created_at: call.created_at,
    durationSec: call.duration,
    status: call.status as any,
    score: call.score,
    // Campos extras para detalhes
    audio_url: call.audio_url,
    transcription: call.transcription,
    person_name: call.person_name,
    person_email: call.person_email
  };
}

/**
 * Converte SdrStats para SdrUser (compatibilidade)
 */
export function convertToSdrUser(sdr: SdrStats): SdrUser {
  return {
    id: sdr.id,
    name: sdr.name,
    email: sdr.email,
    avatarUrl: sdr.avatarUrl,
    callCount: sdr.callCount
  };
}

// =========================================
// FUNÇÕES LEGADAS (COMPATIBILIDADE)
// =========================================

/**
 * @deprecated Use fetchCallsWithFilters instead
 */
export async function fetchCalls(filters: any = {}): Promise<any> {
  const response = await fetchCallsWithFilters(filters);
  return {
    calls: response.calls,
    totalCount: response.totalCount
  };
}

/**
 * @deprecated Use fetchCallDetails instead
 */
export async function fetchCallDetail(callId: string): Promise<any> {
  return await fetchCallDetails(callId);
}

/**
 * @deprecated Use fetchUniqueSdrsWithStats instead
 */
export async function fetchUniqueSdrs(): Promise<SdrUser[]> {
  const sdrs = await fetchUniqueSdrsWithStats();
  return sdrs.map(convertToSdrUser);
}
