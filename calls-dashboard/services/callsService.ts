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
  min_score?: number;
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

    // Tentar função com análise primeiro, senão fallback para básica
    let data, error;
    try {
      const result = await supabase.rpc('get_dashboard_metrics_with_analysis', {
        p_days: days
      });
      data = result.data;
      error = result.error;
    } catch (err) {
      console.log('⚠️ Função with_analysis não encontrada, usando básica...');
      const result = await supabase.rpc('get_dashboard_metrics', {
        p_days: days
      });
      data = result.data;
      error = result.error;
    }

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
      return 'Numero mudou';
    case 'recovery_on_timer_expire':
      return 'Tempo esgotado';
    case 'unallocated_number':
      return 'Número não encontrado';
    default:
      return statusVoip || 'Status desconhecido';
  }
}

/**
 * Busca calls com filtros e paginação (implementação restaurada com duration_formatted)
 */
export async function fetchCalls(filters: CallsFilters = {}): Promise<CallsResponse> {
  // Criar chave única para a requisição baseada nos filtros
  const requestKey = `fetchCalls-${JSON.stringify(filters)}`;
  
  return managedRequest(requestKey, async () => {
    try {
      console.log('🔍 CALLS SERVICE - Buscando calls com filtros (implementação restaurada):', filters);

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
      max_duration,
      min_score
    } = filters;

    // Converter datas para timestamp se fornecidas
    const startTimestamp = start ? new Date(start + 'T00:00:00').toISOString() : null;
    const endTimestamp = end ? new Date(end + 'T23:59:59').toISOString() : null;
    
    console.log('🔍 CALLS SERVICE - TODOS OS FILTROS RECEBIDOS:', {
      sdr_email,
      status,
      call_type,
      start,
      end,
      min_duration,
      max_duration,
      limit,
      offset,
      sortBy
    });

    // Determinar antecipadamente se a ordenação é por score (usado em várias etapas)
    const isScoreFilter = sortBy === 'score' || sortBy === 'score_asc';

    // ✅ NOVA ABORDAGEM: Puxar direto da tabela calls (sem função RPC)
    console.log('🔍 CALLS SERVICE - Buscando dados diretamente da tabela calls');
    console.log('🔍 CALLS SERVICE - Parâmetros recebidos:', {
      sdr_email, status, call_type, start_date, end_date, min_duration, max_duration, min_score, search_query, limit, offset, sortBy
    });

    // ✅ QUERY DIRETA: Puxar dados básicos da tabela calls
    let query = supabase
      .from('calls')
      .select('*');

    // Aplicar filtros (versão original que funcionava)
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
      console.log('🔍 CALLS SERVICE - Filtro início aplicado:', startTimestamp);
    }

    if (endTimestamp) {
      query = query.lte('created_at', endTimestamp);
      console.log('🔍 CALLS SERVICE - Filtro fim aplicado:', endTimestamp);
    }

    // IMPORTANTE: Não filtrar por duração no banco, pois a duração real pode vir de duration_formated
    // O filtro de duração será aplicado no frontend usando getRealDuration()
    if (min_duration) {
      console.log('🔍 CALLS SERVICE - Filtro de duração será aplicado no frontend usando getRealDuration():', min_duration);
    }
    if (max_duration) {
      console.log('🔍 CALLS SERVICE - Filtro de duração máxima será aplicado no frontend:', max_duration);
    }

    // Determinar ordenação baseada no sortBy
    let orderField = 'created_at';
    let orderAscending = false;
    
    // Para filtros de score, buscar TODAS as chamadas COM NOTA para ordenação global
    const effectiveLimit = isScoreFilter ? 10000 : limit; // Buscar todas para score
    const effectiveOffset = isScoreFilter ? 0 : offset; // Sempre do início para score
    
    // Se é ordenação por score, filtrar apenas chamadas com análise (mesma lógica do painel)
    if (isScoreFilter) {
      query = query.not('call_analysis.final_grade', 'is', null);
      console.log('🎯 CALLS SERVICE - Filtro automático aplicado: apenas chamadas com call_analysis.final_grade');
    }
    
    switch (sortBy) {
      case 'duration':
        orderField = 'duration';
        orderAscending = false; // Maior duração primeiro
        break;
      case 'score':
      case 'with_score':
        // Para score, ordenar no frontend após buscar os dados (pois score pode vir de múltiplas fontes)
        orderField = 'created_at';
        orderAscending = false;
        break;
      case 'company':
        orderField = 'enterprise';
        orderAscending = true; // A-Z
        break;
      default: // created_at
        orderField = 'created_at';
        orderAscending = false; // Mais recente primeiro
        break;
    }

    console.log('🔍 CALLS SERVICE - Ordenação escolhida:', {
      sortBy,
      orderField,
      orderAscending,
      motivo: sortBy === 'score' ? 'Score será ordenado no frontend' : `Ordenação por ${sortBy}`
    });

    // Aplicar ordenação e paginação com controle de timeout
    console.log('🔍 CALLS SERVICE - Executando query final...');
    const { data, error } = await query
      .range(effectiveOffset, effectiveOffset + effectiveLimit - 1)
      .order(orderField, { ascending: orderAscending })
      .abortSignal(controller.signal);

    if (error) {
      console.error('❌ CALLS SERVICE - Erro na query:', error);
      throw error;
    }

    console.log('✅ CALLS SERVICE - Query executada com sucesso:', data?.length || 0, 'registros');

    clearTimeout(timeoutId);

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar calls:', JSON.stringify(error, null, 2));
      if (error.name === 'AbortError') {
        throw new Error('Timeout: A busca demorou muito para responder. Tente filtros mais específicos.');
      }
      throw error;
    }

    console.log('📊 CALLS SERVICE - Query executada, resultado:', {
      totalRetornado: data?.length || 0,
      filtrosAplicados: {
        sdr_email: !!sdr_email,
        status: !!status,
        call_type: !!call_type,
        start: !!start,
        end: !!end,
        min_duration: !!min_duration,
        max_duration: !!max_duration
      }
    });

    // Debug específico para duração
    if (min_duration && data && data.length > 0) {
      console.log('🔍 CALLS SERVICE - Durações encontradas:', 
        data.slice(0, 5).map(call => ({ id: call.id, duration: call.duration }))
      );
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhuma call encontrada com os filtros aplicados');
      return {
        calls: [],
        totalCount: 0,
        hasMore: false
      };
    }

    // Contar total de registros com os mesmos filtros
    // Quando ordenando por nota, contamos APENAS chamadas com análise (final_grade presente)
    let countQuery = isScoreFilter
      ? supabase
          .from('calls')
          .select('id, call_analysis!inner(final_grade)', { count: 'exact', head: true })
          .not('call_analysis.final_grade', 'is', null)
      : supabase
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

    // Não aplicar filtros de duração na contagem - será feito no frontend
    // Para isScoreFilter, já aplicamos o filtro por análise acima

    // Timeout separado para contagem
    const countController = new AbortController();
    const countTimeoutId = setTimeout(() => countController.abort(), 5000); // 5 segundos para contagem

    const { count: totalCount } = await countQuery.abortSignal(countController.signal);
    clearTimeout(countTimeoutId);

    console.log('📊 CALLS SERVICE - Contagem concluída:', {
      totalCount,
      dataLength: data?.length || 0,
      offset,
      limit,
      discrepancia: (totalCount || 0) !== (data?.length || 0),
      ordenacao_usada: orderField
    });

    const hasMore = offset + limit < (totalCount || 0);

    // Aplicar filtro de score mínimo no frontend (após buscar todos os dados)
    let filteredData = data;
    if (min_score && isScoreFilter) {
      const threshold = min_score > 10 ? min_score / 10 : min_score; // normalizar 0–100 → 0–10
      console.log('🔍 Aplicando filtro de score mínimo:', { min_score, threshold });
      filteredData = data.filter(call => {
        const finalScore = (() => {
          // Mesmo cálculo do convertToCallItem
          if (call.scorecard) {
            const sc = call.scorecard;
            if (typeof sc.final_score === 'number') return sc.final_score;
            if (typeof sc.total_score === 'number') return sc.total_score;
            if (typeof sc.score === 'number') return sc.score;
          }
          if (call.call_analysis && Array.isArray(call.call_analysis) && call.call_analysis.length > 0) {
            const analysis = call.call_analysis[0];
            if (typeof analysis?.final_grade === 'number') return analysis.final_grade;
          }
          if (call.call_analysis && !Array.isArray(call.call_analysis)) {
            if (typeof call.call_analysis.final_grade === 'number') return call.call_analysis.final_grade;
          }
          return undefined;
        })();
        return typeof finalScore === 'number' && finalScore >= threshold;
      });
      console.log('🔍 Após filtro de score:', filteredData.length, 'chamadas restantes');
    }

    // ✅ BUSCAR NOTAS PARA CADA CALL (mesmo método do detalhamento)
    const callsWithAnalysis = await Promise.all(
      filteredData.map(async (call) => {
        // Calcular duration_formatted
        let durationFormatted = '00:00:00';
        if (call.duration && call.duration > 0) {
          const hours = Math.floor(call.duration / 3600);
          const minutes = Math.floor((call.duration % 3600) / 60);
          const seconds = call.duration % 60;
          
          if (hours > 0) {
            durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            durationFormatted = `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        }
        
        // ✅ BUSCAR NOTA USANDO get_call_analysis (mesmo do detalhamento)
        let score = null;
        try {
          const { data, error } = await supabase.rpc('get_call_analysis', {
            p_call_id: call.id
          });
          if (!error && data?.[0]) {
            const analysis = data[0];
            if (analysis.final_grade !== null && analysis.final_grade !== undefined) {
              score = analysis.final_grade;
              console.log('✅ Nota encontrada para', call.id, ':', score);
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar análise para', call.id, err);
        }

        console.log('🔍 DEBUG CALL:', {
          id: call.id,
          to_number: call.to_number,
          status_voip: call.status_voip,
          score: score
        });

        return {
          ...call,
          status_voip_friendly: mapStatusVoip(call.status_voip),
          duration_formatted: durationFormatted,
          score: score, // ✅ Nota buscada via get_call_analysis
          // ✅ SIMPLES: Campos de telefone
          from_number: call.from_number,
          to_number: call.to_number,
          // ✅ SIMPLES: Campos de empresa e pessoa
          company_name: call.enterprise,
          person_name: call.person,
          total_count: totalCount || 0
        };
      })
    );

    const callsWithFriendlyStatus = callsWithAnalysis;

    console.log(`✅ CALLS SERVICE - ${filteredData.length} calls encontradas (${totalCount} total) com duration_formatted calculado`);

    // Se for filtro de score, buscar páginas adicionais além do limite do PostgREST (ex.: 1000)
    if (isScoreFilter && (totalCount || 0) > filteredData.length) {
      const fetchSize = 1000; // tamanho por página para paginação interna
      let fetched = filteredData.length;
      console.log('🔁 Buscando páginas adicionais para ordenação global por nota...', { totalCount, alreadyFetched: fetched });

      while (fetched < (totalCount || 0)) {
        const start = fetched;
        const end = Math.min(fetched + fetchSize - 1, (totalCount || 1) - 1);

        let pageQuery = supabase
          .from('calls')
          .select(isScoreFilter ? `
            *,
            scorecard,
            call_analysis!inner(final_grade)
          ` : `
            *,
            scorecard,
            call_analysis!left(final_grade)
          `);

        if (sdr_email) {
          pageQuery = pageQuery.ilike('agent_id', `%${sdr_email}%`);
        }
        if (status) {
          pageQuery = pageQuery.eq('status_voip', status);
        }
        if (call_type) {
          pageQuery = pageQuery.eq('call_type', call_type);
        }
        if (startTimestamp) {
          pageQuery = pageQuery.gte('created_at', startTimestamp);
        }
        if (endTimestamp) {
          pageQuery = pageQuery.lte('created_at', endTimestamp);
        }

        // Em ordenação por nota, garantir que apenas chamadas com nota sejam buscadas nas páginas adicionais
        if (isScoreFilter) {
          pageQuery = pageQuery.not('call_analysis.final_grade', 'is', null);
        }

        const { data: more, error: moreErr } = await pageQuery
          .range(start, end)
          .order(orderField, { ascending: orderAscending });

        if (moreErr) {
          console.error('❌ CALLS SERVICE - Erro ao buscar página adicional:', moreErr);
          break;
        }
        if (more && more.length > 0) {
          filteredData.push(...more);
          fetched += more.length;
          console.log('🔁 Página adicional carregada:', { fetched, lastBatch: more.length });
        } else {
          break;
        }
      }
    }

    return {
      calls: callsWithFriendlyStatus,
      totalCount: totalCount || 0,
      hasMore
    };

  } catch (error: any) {
    console.error('💥 CALLS SERVICE - Erro inesperado:', JSON.stringify(error, null, 2));
    
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
    console.log('🔍 CALLS SERVICE - Buscando detalhes via get_call_detail:', callId);

    // Usar nossa nova função que funciona
    const { data, error } = await supabase.rpc('get_call_detail', { p_call_id: callId });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar detalhes da call:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Call não encontrada');
      return null;
    }

    const callData = Array.isArray(data) ? data[0] : data;

    // Mapear para o formato esperado usando dados corretos
    const callDetail: CallWithDetails = {
      ...callData,
      status_voip_friendly: mapStatusVoip(callData.status_voip),
      company_name: callData.enterprise || 'Empresa não informada',
      person_name: callData.person || 'Pessoa não informada',
      person_email: callData.insights?.person_email || '',
      // usar o UUID real do SDR quando disponível
      sdr_id: callData.sdr_id || null,
      sdr_name: callData.agent_id,
      sdr_email: callData.sdr_email || callData.agent_id,
      sdr_avatar_url: `https://i.pravatar.cc/64?u=${callData.agent_id}`,
      audio_url: callData.recording_url || ''
    };

    console.log('✅ CALLS SERVICE - Detalhes da call encontrados');
    return callDetail;

  } catch (error) {
    console.error('💥 CALLS SERVICE - Erro inesperado ao buscar detalhes:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Busca lista de SDRs únicos para filtros
 */
export async function fetchUniqueSdrs(): Promise<SdrUser[]> {
  try {
    console.log('🔍 CALLS SERVICE - Buscando SDRs únicos');

    // Buscar SDRs do Supabase
    const { data, error } = await supabase.rpc('get_unique_sdrs');
    
    console.log('🔍 CALLS SERVICE - Resultado get_unique_sdrs:', { data, error });

    if (error) {
      console.error('❌ CALLS SERVICE - Erro ao buscar SDRs:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📭 CALLS SERVICE - Nenhum SDR encontrado');
      return [];
    }

    const sdrs: SdrUser[] = data.map((sdr: any) => {
      console.log('🔍 CALLS SERVICE - Mapeando SDR:', sdr);
      return {
        id: sdr.sdr_email,
        name: sdr.sdr_name,
        email: sdr.sdr_email,
        avatarUrl: sdr.sdr_avatar_url || `https://i.pravatar.cc/64?u=${sdr.sdr_email}`,
        callCount: sdr.call_count
      };
    });

    console.log(`✅ CALLS SERVICE - ${sdrs.length} SDRs mapeados:`, sdrs);
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
      
      // Debug removido para evitar poluição no console
    } catch (error) {
      console.warn('Erro ao converter duration_formated:', call.duration_formated);
    }
  }

  // Helper para converter qualquer valor em número válido (0-10)
  const toScoreNumber = (value: any): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return undefined;
    // Aceitar 0-10 (ou 0-100 e normalizar, se necessário)
    if (n >= 0 && n <= 10) return n;
    if (n > 10 && n <= 100) return Math.round((n / 10) * 10) / 10; // normalizar 0-100 para 0-10
    return undefined;
  };

  // Priorizar scorecard > call_analysis (não há coluna score na tabela calls)
  const finalScore = (() => {
    // Primeiro: scorecard JSONB
    if (call.scorecard) {
      const sc = call.scorecard;
      const fromFinal = toScoreNumber(sc.final_score);
      if (fromFinal !== undefined) return fromFinal;
      const fromTotal = toScoreNumber(sc.total_score);
      if (fromTotal !== undefined) return fromTotal;
      const fromScore = toScoreNumber(sc.score);
      if (fromScore !== undefined) return fromScore;
    }
    // Segundo: call_analysis join (array)
    if (call.call_analysis && Array.isArray(call.call_analysis) && call.call_analysis.length > 0) {
      const analysis = call.call_analysis[0]; // Primeiro resultado
      const fromCA = toScoreNumber(analysis?.final_grade);
      if (fromCA !== undefined) return fromCA;
    }
    // Terceiro: call_analysis como objeto direto
    if (call.call_analysis && !Array.isArray(call.call_analysis)) {
      const fromCAObj = toScoreNumber(call.call_analysis.final_grade);
      if (fromCAObj !== undefined) return fromCAObj;
    }
    return undefined;
  })();

  return {
    id: call.id,
    company: call.enterprise || call.company_name || 'Empresa não informada',
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
    score: finalScore,
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
