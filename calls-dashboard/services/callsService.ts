import { supabase } from '../../services/supabaseClient';
import { CallItem, SdrUser } from '../types';

export interface DashboardMetrics {
  total_calls: number;
  answered_calls: number;
  answered_rate: number;
  avg_duration: number;
  total_sdrs: number;
  period_start: string;
  period_end: string;
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
  status_voip?: string; // Status VOIP original
  status_voip_friendly?: string; // Status VOIP amigável
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
  score?: number;
  from_number: string;
  to_number: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  processed_at: string;
  total_count?: number;
  // Campos extras para detalhes
  comments?: any;
  detailed_scores?: any;
}

export interface CallsFilters {
  sdr_email?: string;
  status?: string;
  call_type?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export interface CallsResponse {
  calls: CallWithDetails[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Busca métricas do dashboard
 */
export async function fetchDashboardMetrics(days: number = 14): Promise<DashboardMetrics | null> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando métricas do dashboard');

    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_days: days
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar métricas:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhuma métrica encontrada');
      return null;
    }

    console.log('✅ CALLS SERVICE - Métricas do dashboard encontradas');
    return data[0];

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar métricas:', error);
    throw error;
  }
}

/**
 * Busca calls com filtros e paginação
 */
export async function fetchCalls(filters: CallsFilters = {}): Promise<CallsResponse> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando calls com filtros:', filters);

    const {
      sdr_email,
      status,
      call_type,
      start,
      end,
      limit = 50,
      offset = 0
    } = filters;

    // Converter datas para timestamp se fornecidas
    const startTimestamp = start ? new Date(start).toISOString() : null;
    const endTimestamp = end ? new Date(end).toISOString() : null;

    const { data, error } = await supabase.rpc('get_calls_with_filters', {
      p_sdr: sdr_email,
      p_status: status,
      p_type: call_type,
      p_start_date: startTimestamp,
      p_end_date: endTimestamp,
      p_limit: limit,
      p_offset: offset
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
 * Busca detalhes de uma call específica
 */
export async function fetchCallDetail(callId: string): Promise<CallWithDetails | null> {
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
 * Busca lista de SDRs únicos para filtros
 */
export async function fetchUniqueSdrs(): Promise<SdrUser[]> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando SDRs únicos');

    const { data, error } = await supabase.rpc('get_unique_sdrs');

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar SDRs:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhum SDR encontrado');
      return [];
    }

    const sdrs: SdrUser[] = data.map((sdr: any) => ({
      id: sdr.sdr_email,
      name: sdr.sdr_name,
      email: sdr.sdr_email,
      avatarUrl: sdr.sdr_avatar_url || `https://i.pravatar.cc/64?u=${sdr.sdr_email}`,
      callCount: sdr.call_count
    }));

    console.log(`✅ CALLS SERVICE - ${sdrs.length} SDRs encontrados`);
    return sdrs;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar SDRs:', error);
    throw error;
  }
}

/**
 * Converte CallWithDetails para CallItem (compatibilidade)
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
      avatarUrl: call.sdr_avatar_url || `https://i.pravatar.cc/64?u=${call.sdr_email}`
    },
    date: call.created_at,
    created_at: call.created_at,
    durationSec: call.duration,
    status: call.status as any,
    status_voip: call.status_voip,
    status_voip_friendly: call.status_voip_friendly,
    score: call.score || (call.scorecard ? extractScoreFromScorecard(call.scorecard) : undefined),
    // Campos extras para detalhes
    audio_url: call.audio_url,
    recording_url: call.recording_url,
    transcription: call.transcription,
    person_name: call.person_name,
    person_email: call.person_email,
    to_number: call.to_number,
    from_number: call.from_number,
    call_type: call.call_type,
    direction: call.direction
  };
}

/**
 * Extrai score do scorecard JSONB
 */
function extractScoreFromScorecard(scorecard: any): number | undefined {
  if (!scorecard) return undefined;
  
  // Tentar diferentes estruturas possíveis
  if (typeof scorecard.total_score === 'number') return scorecard.total_score;
  if (typeof scorecard.score === 'number') return scorecard.score;
  if (typeof scorecard.final_score === 'number') return scorecard.final_score;
  
  return undefined;
}

/**
 * Sincroniza dados de um deal do Pipedrive
 */
export async function syncPipedriveDeal(dealData: {
  deal_id: string;
  title?: string;
  org_name?: string;
  org_id?: number;
  person_name?: string;
  person_email?: string;
  person_id?: number;
  status?: string;
  value?: number;
  currency?: string;
  stage_name?: string;
  owner_name?: string;
  owner_email?: string;
  raw_data?: any;
}): Promise<boolean> {
  try {
    console.log('🔄 CALLS SERVICE - Sincronizando deal do Pipedrive:', dealData.deal_id);

    const { data, error } = await supabase.rpc('sync_pipedrive_deal', {
      p_deal_id: dealData.deal_id,
      p_title: dealData.title || null,
      p_org_name: dealData.org_name || null,
      p_org_id: dealData.org_id || null,
      p_person_name: dealData.person_name || null,
      p_person_email: dealData.person_email || null,
      p_person_id: dealData.person_id || null,
      p_status: dealData.status || null,
      p_value: dealData.value || null,
      p_currency: dealData.currency || null,
      p_stage_name: dealData.stage_name || null,
      p_owner_name: dealData.owner_name || null,
      p_owner_email: dealData.owner_email || null,
      p_raw_data: dealData.raw_data || {}
    });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao sincronizar deal:', error);
      return false;
    }

    console.log('✅ CALLS SERVICE - Deal sincronizado com sucesso');
    return true;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao sincronizar deal:', error);
    return false;
  }
}
