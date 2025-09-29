import { supabase } from '../../services/supabaseClient';
import { CallItem } from '../types';

export interface CallFilters {
  sdr_email?: string;
  status?: string;
  call_type?: string;
  start_date?: string;
  end_date?: string;
  min_duration?: number;
  max_duration?: number;
  min_score?: number;
  search_query?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
}

export interface CallResponse {
  calls: CallItem[];
  totalCount: number;
  hasMore: boolean;
}

// Função para mapear status VOIP
const mapStatusVoip = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'normal_clearing': 'Atendida',
    'busy': 'Ocupado',
    'no_answer': 'Sem resposta',
    'congestion': 'Congestionado',
    'unavailable': 'Indisponível',
    'rejected': 'Rejeitada',
    'failed': 'Falhou',
    'timeout': 'Timeout',
    'cancelled': 'Cancelada',
    'abandoned': 'Abandonada'
  };
  return statusMap[status] || status;
};

// Função para extrair score do scorecard ou call_analysis
const extractScore = (call: any): number | null => {
  // Prioridade 1: call_analysis.final_grade
  if (call.call_analysis?.final_grade !== null && call.call_analysis?.final_grade !== undefined) {
    return call.call_analysis.final_grade;
  }
  
  // Prioridade 2: scorecard.final_score
  if (call.scorecard?.final_score !== null && call.scorecard?.final_score !== undefined) {
    return call.scorecard.final_score;
  }
  
  // Prioridade 3: scorecard.total_score
  if (call.scorecard?.total_score !== null && call.scorecard?.total_score !== undefined) {
    return call.scorecard.total_score;
  }
  
  // Prioridade 4: scorecard.score
  if (call.scorecard?.score !== null && call.scorecard?.score !== undefined) {
    return call.scorecard.score;
  }
  
  return null;
};

export async function getCallsDirect(filters: CallFilters): Promise<CallResponse> {
  const {
    sdr_email,
    status,
    call_type,
    start_date,
    end_date,
    min_duration,
    max_duration,
    min_score,
    search_query,
    limit = 50,
    offset = 0,
    sortBy = 'created_at'
  } = filters;

  console.log('🔍 CALLS SERVICE DIRECT - Buscando dados diretamente da tabela calls');

  try {
    // Construir query direta na tabela calls com JOIN
    let query = supabase
      .from('calls')
      .select(`
        *,
        call_analysis!left(final_grade, general_feedback, created_at)
      `);

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

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (min_duration) {
      query = query.gte('duration', min_duration);
    }

    if (max_duration) {
      query = query.lte('duration', max_duration);
    }

    if (min_score) {
      query = query.gte('call_analysis.final_grade', min_score);
    }

    if (search_query) {
      query = query.or(`deal_id.ilike.%${search_query}%,enterprise.ilike.%${search_query}%,person.ilike.%${search_query}%`);
    }

    // Aplicar ordenação
    switch (sortBy) {
      case 'score':
      case 'score_desc':
        query = query.order('call_analysis.final_grade', { ascending: false });
        break;
      case 'score_asc':
        query = query.order('call_analysis.final_grade', { ascending: true });
        break;
      case 'duration':
        query = query.order('duration', { ascending: false });
        break;
      case 'duration_asc':
        query = query.order('duration', { ascending: true });
        break;
      case 'created_at':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    console.log('🔍 CALLS SERVICE DIRECT - Executando query direta...');
    const { data: callsData, error: callsError, count } = await query;

    if (callsError) {
      console.error('❌ CALLS SERVICE DIRECT - Erro na query:', callsError);
      throw callsError;
    }

    console.log('✅ CALLS SERVICE DIRECT - Query executada com sucesso:', callsData?.length || 0, 'registros');

    // Processar dados
    const processedCalls = (callsData || []).map((call: any) => {
      // Calcular duration_formatted
      const durationVal = call.duration || 0;
      let durationFormatted = '00:00:00';
      if (durationVal > 0) {
        const hours = Math.floor(durationVal / 3600);
        const minutes = Math.floor((durationVal % 3600) / 60);
        const seconds = durationVal % 60;
        durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // Extrair score
      const score = extractScore(call);

      return {
        ...call,
        duration: durationVal,
        duration_formatted: durationFormatted,
        status_voip_friendly: mapStatusVoip(call.status_voip),
        score: score,
        // Campos extras para compatibilidade
        company_name: call.enterprise || 'N/A',
        person_name: call.person || 'N/A',
        sdr_name: call.agent_id || 'N/A',
        sdr_email: call.insights?.sdr_email || call.insights?.agent_email || 'N/A',
        total_count: count || 0
      };
    });

    return {
      calls: processedCalls as CallItem[],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };

  } catch (error) {
    console.error('❌ CALLS SERVICE DIRECT - Erro geral:', error);
    throw error;
  }
}
