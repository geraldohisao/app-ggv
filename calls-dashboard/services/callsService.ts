import { supabase } from '../../services/supabaseClient';
import { CallItem, SdrUser } from '../types';
import { managedRequest } from '../utils/connectionManager';

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
  duration_formated?: string;
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
  sortBy?: string;
  min_duration?: number;
  max_duration?: number;
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
 * Mapeia status VOIP para status amigável
 */
function mapStatusVoip(statusVoip: string): string {
  switch (statusVoip) {
    case 'normal_clearing':
      return 'Atendida';
    case 'no_answer':
      return 'Não atendida';
    case 'originator_cancel':
      return 'Cancelada pela SDR';
    case 'number_changed':
      return 'Número mudou';
    case 'recovery_on_timer_expire':
      return 'Tempo esgotado';
    case 'unallocated_number':
      return 'Número inválido';
    default:
      return statusVoip || 'Status desconhecido';
  }
}

/**
 * Busca calls com filtros e paginação
 */
export async function fetchCalls(filters: CallsFilters = {}): Promise<CallsResponse> {
  // Criar chave única para a requisição baseada nos filtros
  const requestKey = `fetchCalls-${JSON.stringify(filters)}`;
  
  return managedRequest(requestKey, async () => {
    try {
      console.log('🔍 CALLS SERVICE - Buscando calls com filtros:', filters);

      // Timeout para evitar requests longos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    const {
      sdr_email,
      status,
      call_type,
      start,
      end,
      limit = 500,
      offset = 0,
      sortBy = 'created_at',
      min_duration,
      max_duration
    } = filters;

    // Converter datas para timestamp se fornecidas
    const startTimestamp = start ? new Date(start).toISOString() : null;
    const endTimestamp = end ? new Date(end).toISOString() : null;

    // Construir query com filtros aplicados
    let query = supabase
      .from('calls')
      .select('*');

    // Aplicar filtros
    if (sdr_email) {
      query = query.ilike('agent_id', `%${sdr_email}%`);
    }

    if (status) {
      query = query.eq('status_voip', status);
    }

    if (call_type) {
      query = query.eq('call_type', call_type);
    }

    if (startTimestamp) {
      query = query.gte('created_at', startTimestamp);
    }

    if (endTimestamp) {
      query = query.lte('created_at', endTimestamp);
    }

    if (min_duration) {
      query = query.gte('duration', parseInt(min_duration));
    }

    if (max_duration) {
      query = query.lte('duration', parseInt(max_duration));
    }

    // Aplicar ordenação e paginação com controle de timeout
    const { data, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar calls:', error);
      if (error.name === 'AbortError') {
        throw new Error('Timeout: A busca demorou muito para responder. Tente filtros mais específicos.');
      }
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

    // Contar total de registros com os mesmos filtros
    let countQuery = supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });

    // Aplicar os mesmos filtros para contagem
    if (sdr_email) {
      countQuery = countQuery.ilike('agent_id', `%${sdr_email}%`);
    }

    if (status) {
      countQuery = countQuery.eq('status_voip', status);
    }

    if (call_type) {
      countQuery = countQuery.eq('call_type', call_type);
    }

    if (startTimestamp) {
      countQuery = countQuery.gte('created_at', startTimestamp);
    }

    if (endTimestamp) {
      countQuery = countQuery.lte('created_at', endTimestamp);
    }

    if (min_duration) {
      countQuery = countQuery.gte('duration', parseInt(min_duration));
    }

    if (max_duration) {
      countQuery = countQuery.lte('duration', parseInt(max_duration));
    }

    // Timeout separado para contagem
    const countController = new AbortController();
    const countTimeoutId = setTimeout(() => countController.abort(), 5000); // 5 segundos para contagem

    const { count: totalCount } = await countQuery.abortSignal(countController.signal);
    clearTimeout(countTimeoutId);

    const hasMore = offset + limit < (totalCount || 0);

    // Mapear status_voip para status_voip_friendly no frontend
    const callsWithFriendlyStatus = data.map(call => ({
      ...call,
      status_voip_friendly: mapStatusVoip(call.status_voip),
      total_count: totalCount || 0
    }));

    console.log(`✅ CALLS SERVICE - ${data.length} calls encontradas (${totalCount} total)`);

    return {
      calls: callsWithFriendlyStatus,
      totalCount: totalCount || 0,
      hasMore
    };

  } catch (error: any) {
    console.error('💥 CALLS SERVICE - Erro inesperado:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout: A busca foi cancelada por demorar muito. Tente filtros mais específicos.');
    }
    
    if (error.message?.includes('AbortError')) {
      throw new Error('Conexão interrompida. Verifique sua internet e tente novamente.');
    }
    
    throw error;
  }
  });
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
export function convertToCallItem(call: any): CallItem {
  // Converter duration_formated para segundos
  let durationInSeconds = call.duration || 0;
  
  if (call.duration_formated && call.duration_formated !== '00:00:00') {
    try {
      const parts = call.duration_formated.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      durationInSeconds = hours * 3600 + minutes * 60 + seconds;
      
      console.log(`🕐 Convertendo duração: ${call.duration_formated} → ${durationInSeconds}s`);
    } catch (error) {
      console.warn('Erro ao converter duration_formated:', call.duration_formated);
    }
  }

  return {
    id: call.id,
    company: call.enterprise || call.company_name || 'Empresa não informada',
    person: call.person || call.person_name || 'Contato não identificado',
    dealCode: call.deal_id || 'N/A',
    sdr: {
      id: call.agent_id || call.sdr_id,
      name: call.agent_id || call.sdr_name || 'SDR não identificado',
      email: call.sdr_email || '',
      avatarUrl: `https://i.pravatar.cc/64?u=${call.agent_id || call.sdr_id || 'default'}`
    },
    date: call.created_at,
    created_at: call.created_at,
    durationSec: durationInSeconds,
    duration_formated: call.duration_formated,
    status: call.status as any,
    status_voip: call.status_voip,
    status_voip_friendly: call.status_voip_friendly,
    score: call.score || (call.scorecard ? extractScoreFromScorecard(call.scorecard) : undefined),
    // Campos extras para detalhes
    audio_url: call.audio_url,
    recording_url: call.recording_url,
    transcription: call.transcription,
    person_name: call.person || call.person_name,
    person_email: call.person_email,
    to_number: call.to_number,
    from_number: call.from_number,
    call_type: call.call_type,
    direction: call.direction
  };
}

/**
 * Extrai score do scorecard JSONB (escala 0-10)
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
