import { supabase } from './supabaseClient';

export interface CallsQuery {
  limit?: number;
  offset?: number;
  sdrId?: string;   // ID do usuário (SDR, Closer, etc.)
  status?: string;
  callType?: string;
  start?: string; // ISO
  end?: string;   // ISO
  minDuration?: number; // Duração mínima em segundos
  maxDuration?: number; // Duração máxima em segundos
}

export interface UiCallItem {
  id: string;
  company?: string | null;
  deal_id?: string | null;
  dealCode?: string | null; // Alias for deal_id
  sdr_id?: string | null;
  sdr_name?: string | null;
  sdr_email?: string | null;
  status: string;
  duration: number;
  durationSec?: number; // Alias for duration
  call_type?: string | null;
  direction?: string | null;
  recording_url?: string | null;
  audio_bucket?: string | null;
  audio_path?: string | null;
  transcription?: string | null;
  transcript_status?: string | null;
  ai_status?: string | null;
  insights?: any;
  scorecard?: any;
  from_number?: string | null;
  to_number?: string | null;
  agent_id?: string | null;
  provider_call_id?: string | null; // Added missing property
  created_at: string;
  date?: string; // Alias for created_at
  updated_at?: string | null;
  processed_at?: string | null;
}

export async function fetchCalls(query: CallsQuery): Promise<{ items: UiCallItem[]; total: number }> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return { items: [], total: 0 };
  }
  
  const { limit = 50, offset = 0, sdrId, status, callType, start, end, minDuration, maxDuration } = query;
  console.log('🔍 Chamando get_calls_v2 com:', {
    p_limit: limit,
    p_offset: offset,
    p_sdr_id: sdrId ?? null,
    p_status: status ?? null,
    p_call_type: callType ?? null,
    p_start: start ?? null,
    p_end: end ?? null,
    minDuration,
    maxDuration,
  });
  
  try {
    console.log('🔍 Chamando RPC get_calls_v2 com parâmetros:', {
      p_limit: limit,
      p_offset: offset,
      p_sdr_id: sdrId ?? null,
      p_status: status ?? null,
      p_call_type: callType ?? null,
      p_start: start ?? null,
      p_end: end ?? null,
    });
    
    const { data, error } = await supabase.rpc('get_calls_with_filters', {
      p_sdr: sdrId ?? null,
      p_status: status ?? null,
      p_type: callType ?? null,
      p_start_date: start ? new Date(start).toISOString() : null,
      p_end_date: end ? new Date(end).toISOString() : null,
      p_limit: limit,
      p_offset: offset,
      p_sort_by: 'created_at',
      p_min_duration: minDuration ?? null,
      p_max_duration: maxDuration ?? null,
      p_min_score: null
    });
    
    if (error) {
      console.error('❌ Erro na RPC get_calls_with_filters:', error);
      throw error;
    }
    
    console.log('✅ Resposta da RPC - Total de registros:', data?.length || 0);
    console.log('✅ Primeiro registro da RPC:', data?.[0]);
    console.log('✅ Estrutura do primeiro registro:', {
      id: data?.[0]?.id,
      sdr_id: data?.[0]?.sdr_id,
      sdr_name: data?.[0]?.sdr_name,
      agent_id: data?.[0]?.agent_id,
      status: data?.[0]?.status,
      call_type: data?.[0]?.call_type
    });
    console.log('✅ Resposta completa da RPC:', data);
    
    const items: UiCallItem[] = (data || []).map((r: any) => ({
      id: r.id,
      company: r.enterprise || r.company || `Deal ${r.deal_id}` || 'Empresa não informada',
      deal_id: r.deal_id,
      sdr_id: r.sdr_id,
      sdr_name: r.sdr_name || r.agent_id,
      sdr_email: r.sdr_email,
      status: r.status,
      duration: r.duration_seconds || r.duration || 0,
      durationSec: r.duration_seconds || r.duration || 0, // Alias
      call_type: r.call_type,
      direction: r.direction,
      recording_url: r.recording_url,
      audio_bucket: r.audio_bucket,
      audio_path: r.audio_path,
      transcription: r.transcription,
      transcript_status: r.transcript_status,
      ai_status: r.ai_status,
      insights: r.insights,
      scorecard: r.scorecard,
      from_number: r.from_number,
      to_number: r.to_number,
      agent_id: r.agent_id,
      created_at: r.created_at,
      date: r.created_at, // Alias
      updated_at: r.updated_at,
      processed_at: r.processed_at,
    }));

    // Aplicar filtros de duração no frontend (já que a RPC não suporta ainda)
    let filteredItems = items;
    if (minDuration !== undefined) {
      filteredItems = filteredItems.filter(item => (item.duration || 0) >= minDuration);
    }
    if (maxDuration !== undefined) {
      filteredItems = filteredItems.filter(item => (item.duration || 0) <= maxDuration);
    }

    const total = filteredItems.length;
    return { items: filteredItems, total };
  } catch (error) {
    console.error('❌ Erro geral em fetchCalls:', error);
    // Fallback: busca direta na tabela
    try {
      console.log('🔄 Tentando fallback direto na tabela calls...');
      const { data: directData, error: directError } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);
        
      if (directError) throw directError;
      
      console.log('✅ Fallback bem-sucedido:', directData);
      
      const items: UiCallItem[] = (directData || []).map((r: any) => ({
        id: r.id,
        company: r.insights?.company || r.meta?.company || 'Empresa não informada',
        deal_id: r.deal_id,
        sdr_id: r.sdr_id,
        sdr_name: null, // Fallback direto não tem join com profiles
        sdr_email: null,
        status: r.status,
        duration: r.duration,
        call_type: r.call_type,
        direction: r.direction,
        recording_url: r.recording_url,
        audio_bucket: r.audio_bucket,
        audio_path: r.audio_path,
        transcription: r.transcription,
        transcript_status: r.transcript_status,
        ai_status: r.ai_status,
        insights: r.insights,
        scorecard: r.scorecard,
        from_number: r.from_number,
        to_number: r.to_number,
        agent_id: r.agent_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        processed_at: r.processed_at,
      }));

      // Aplicar filtros de duração no fallback também
      let filteredItems = items;
      if (minDuration !== undefined) {
        filteredItems = filteredItems.filter(item => (item.duration || 0) >= minDuration);
      }
      if (maxDuration !== undefined) {
        filteredItems = filteredItems.filter(item => (item.duration || 0) <= maxDuration);
      }
      
      return { items: filteredItems, total: filteredItems.length };
    } catch (fallbackError) {
      console.error('❌ Fallback também falhou:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function fetchCallDetails(callId: string) {
  if (!supabase) return null;
  
  console.log('🔍 Buscando detalhes da chamada:', callId);
  
  // Tenta RPC otimizada primeiro
  try {
    const { data, error } = await supabase.rpc('get_call_details', { p_call_id: callId });
    console.log('📊 RPC get_call_details resultado:', { data, error });
    
    if (error) {
      console.warn('⚠️ Erro na RPC get_call_details:', error);
    } else if (data && data[0]) {
      console.log('✅ Dados da RPC encontrados:', data[0]);
      return data[0];
    }
  } catch (e) {
    console.warn('⚠️ Exceção na RPC get_call_details:', e);
  }
  
  // Fallback: busca direta na tabela com JOIN manual para dados completos
  console.log('🔄 Usando fallback - busca direta na tabela...');
  
  try {
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select(`
        *,
        sdr_name:profiles!calls_sdr_id_fkey(full_name, email, avatar_url)
      `)
      .eq('id', callId)
      .single();
    
    if (callError) {
      console.error('❌ Erro ao buscar chamada:', callError);
      throw callError;
    }
    
    if (callData) {
      // Mapear dados para formato esperado
      const mappedData = {
        ...callData,
        // Mapear dados do perfil
        sdr_name: callData.sdr_name?.full_name || null,
        sdr_email: callData.sdr_name?.email || null,
        sdr_avatar_url: callData.sdr_name?.avatar_url || null,
        // Garantir campos essenciais
        company: callData.insights?.company || `Empresa ${callData.deal_id || 'Desconhecida'}`,
        date: callData.created_at,
        duration: callData.duration || 0,
        durationSec: callData.duration || 0,
      };
      
      console.log('✅ Dados mapeados do fallback:', mappedData);
      return mappedData;
    }
  } catch (fallbackError) {
    console.error('❌ Erro no fallback:', fallbackError);
    throw fallbackError;
  }
  
  return null;
}

export interface CallsMetrics {
  totalCalls: number;
  answeredCalls: number;
  avgDurationSec: number;
  avgScore?: number | null;
}

export interface AdvancedCallsMetrics {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  avg_duration: number;
  total_duration: number;
  with_transcription: number;
  with_audio: number;
  by_call_type: Record<string, number>;
  by_status: Record<string, number>;
}

// Placeholder para, no futuro, trocar por uma RPC específica de métricas.
export function computeMetricsClientSide(items: UiCallItem[]): CallsMetrics {
  const totalCalls = items.length;
  const answeredCalls = items.filter((c: any) => c.status !== 'missed').length;
  const avgDurationSec = items.reduce((a: number, c: any) => a + (c.duration ?? 0), 0) / (totalCalls || 1);
  return { totalCalls, answeredCalls, avgDurationSec, avgScore: null };
}

export async function fetchAdvancedMetrics(query: {
  sdrId?: string;
  start?: string;
  end?: string;
}): Promise<AdvancedCallsMetrics | null> {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase.rpc('get_calls_metrics', {
      p_sdr_id: query.sdrId || null,
      p_start: query.start || null,
      p_end: query.end || null,
    });
    
    if (error) {
      console.error('❌ Erro ao buscar métricas avançadas:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Erro geral em fetchAdvancedMetrics:', error);
    return null;
  }
}

// ---- Scorecard API (CRUD mínimo) ----
export async function listScorecards() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('scorecards').select('*').order('updated_at', { ascending: false });
  if (error) throw error; return data || [];
}

export async function listCriteria(scorecardId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('scorecard_criteria').select('*').eq('scorecard_id', scorecardId).order('order_index');
  if (error) throw error; return data || [];
}

export async function upsertCriterion(row: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('scorecard_criteria').upsert(row).select('*').single();
  if (error) throw error; return data;
}

export async function upsertScorecard(row: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('scorecards').upsert(row).select('*').single();
  if (error) throw error; return data;
}

// ---- Comentários de call ----
export async function listCallComments(callId: string) {
  if (!supabase) return [];
  
  try {
    console.log('🔍 Buscando comentários da chamada:', callId);
    
    // Usar RPC otimizada
    const { data, error } = await supabase.rpc('list_call_comments', { p_call_id: callId });
    
    if (error) {
      console.warn('⚠️ Erro na RPC list_call_comments:', error);
      // Fallback para busca direta
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('call_comments')
        .select('*')
        .eq('call_id', callId)
        .order('created_at', { ascending: true });
      
      if (fallbackError) {
        console.warn('⚠️ Erro no fallback de comentários:', fallbackError);
        return [];
      }
      
      return fallbackData || [];
    }
    
    console.log('✅ Comentários carregados:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.warn('⚠️ Erro ao buscar comentários:', error);
    return [];
  }
}

export async function addCallComment(callId: string, text: string, atSeconds: number = 0) {
  if (!supabase) return null;
  
  try {
    console.log('➕ Adicionando comentário:', { callId, text, atSeconds });
    
    // Usar RPC otimizada
    const { data, error } = await supabase.rpc('add_call_comment', {
      p_call_id: callId,
      p_text: text,
      p_at_seconds: atSeconds
    });
    
    if (error) {
      console.warn('⚠️ Erro na RPC add_call_comment:', error);
      // Fallback para inserção direta
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('call_comments')
        .insert({
          call_id: callId,
          text,
          at_seconds: atSeconds
        })
        .select('*')
        .single();
      
      if (fallbackError) {
        console.warn('⚠️ Erro no fallback de adicionar comentário:', fallbackError);
        // Retorna objeto mock
        return {
          id: Date.now().toString(),
          call_id: callId,
          text,
          at_seconds: atSeconds,
          author_name: 'Você',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      return fallbackData;
    }
    
    console.log('✅ Comentário adicionado:', data?.[0]);
    return data?.[0] || null;
  } catch (error) {
    console.warn('⚠️ Erro ao adicionar comentário:', error);
    // Retorna objeto mock
    return {
      id: Date.now().toString(),
      call_id: callId,
      text,
      at_seconds: atSeconds,
      author_name: 'Você',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

// ---- Scores por critério ----
export async function listCallScores(callId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('call_scores')
    .select('*, scorecard_criteria!inner(id,category,text,weight)')
    .eq('call_id', callId)
    .order('created_at', { ascending: true });
  if (error) throw error; return data || [];
}

// ---- Usuários reais ----
export async function fetchRealUsers() {
  console.log('🔄 fetchRealUsers - Iniciando busca de usuários...');
  if (!supabase) {
    console.log('❌ fetchRealUsers - Supabase não inicializado');
    return [];
  }
  
  try {
    console.log('🔍 fetchRealUsers - Buscando usuários únicos (query otimizada)...');
    
    // Query otimizada que busca usuários únicos diretamente
    const { data: usersData, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        calls!inner(count)
      `)
      .eq('is_active', true) // ✅ FILTRAR APENAS USUÁRIOS ATIVOS
      .not('full_name', 'is', null)
      .neq('full_name', '')
      .not('full_name', 'like', 'Usuário%')
      .limit(50);
    
    if (error) {
      console.log('⚠️ Query otimizada falhou, retornando lista vazia:', error);
      return []; // Não usar fetchUsersAlternative pois tabela profiles não existe
    }
    
    // Processar dados e remover duplicatas
    const userMap = new Map();
    
    for (const user of usersData || []) {
      const cleanName = user.full_name.trim();
      
      // Se já existe um usuário com esse nome, manter o que tem mais chamadas
      if (userMap.has(cleanName)) {
        const existing = userMap.get(cleanName);
        if (user.calls?.length > existing.call_count) {
          userMap.set(cleanName, {
            id: user.id,
            name: cleanName,
            email: user.email || '',
            call_count: user.calls?.length || 0,
            role: 'user'
          });
        }
      } else {
        userMap.set(cleanName, {
          id: user.id,
          name: cleanName,
          email: user.email || '',
          call_count: user.calls?.length || 0,
          role: 'user'
        });
      }
    }
    
    // Converter para array e ordenar
    const uniqueUsers = Array.from(userMap.values())
      .filter(user => user.call_count > 0)
      .sort((a, b) => b.call_count - a.call_count);
    
    console.log('✅ fetchRealUsers - Usuários únicos encontrados:', uniqueUsers.length);
    console.log('📋 fetchRealUsers - Lista:', uniqueUsers);
    
    return uniqueUsers;
    
  } catch (error) {
    console.error('❌ fetchRealUsers - Erro na query otimizada:', error);
    return []; // Não usar fetchUsersAlternative pois tabela profiles não existe
  }
}

// Método alternativo mais simples - DESABILITADO (tabela profiles não existe)
async function fetchUsersAlternative() {
  console.log('🔄 fetchUsersAlternative - DESABILITADO (tabela profiles não existe)');
  
  // RETORNAR LISTA VAZIA PARA EVITAR ERROS
  return [];
  
  try {
    // DESABILITADO: Buscar apenas usuários únicos da tabela profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .not('full_name', 'is', null)
      .neq('full_name', '')
      .not('full_name', 'like', 'Usuário%')
      .limit(20);
    
    if (profilesError) {
      throw profilesError;
    }
    
    // Para cada usuário, contar chamadas de forma simples
    const usersWithCalls = [];
    const processedNames = new Set();
    
    for (const profile of profiles || []) {
      const cleanName = profile.full_name.trim();
      
      // Evitar duplicatas por nome
      if (processedNames.has(cleanName)) {
        continue;
      }
      processedNames.add(cleanName);
      
      try {
        const { count } = await supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.id);
        
        if (count && count > 0) {
          usersWithCalls.push({
            id: profile.id,
            name: cleanName,
            email: profile.email || '',
            call_count: count,
            role: 'user'
          });
        }
      } catch (countError) {
        console.log(`⚠️ Erro ao contar chamadas para ${cleanName}:`, countError);
        // Adicionar usuário mesmo sem contagem
        usersWithCalls.push({
          id: profile.id,
          name: cleanName,
          email: profile.email || '',
          call_count: 0,
          role: 'user'
        });
      }
    }
    
    // Ordenar por número de chamadas
    usersWithCalls.sort((a, b) => b.call_count - a.call_count);
    
    console.log('✅ fetchUsersAlternative - Usuários encontrados:', usersWithCalls.length);
    return usersWithCalls;
    
  } catch (error) {
    console.error('❌ fetchUsersAlternative - Erro:', error);
    return [];
  }
}

// Função alternativa para buscar usuários da tabela calls
async function fetchUsersFromCalls() {
  if (!supabase) return [];
  
  try {
    console.log('🔍 fetchUsersFromCalls - Buscando usuários da tabela calls...');
    
    const { data, error } = await supabase
      .from('calls')
      .select('sdr_id, sdr_name, agent_id')
      .not('sdr_id', 'is', null)
      .limit(100);
    
    if (error) {
      console.error('❌ fetchUsersFromCalls - Erro na query:', error);
      return [];
    }
    
    // Criar mapa de usuários únicos
    const userMap = new Map();
    
    data?.forEach(call => {
      if (call.sdr_id) {
        userMap.set(call.sdr_id, {
          id: call.sdr_id,
          name: call.sdr_name || `Usuário ${call.sdr_id}`,
          role: 'user'
        });
      }
      if (call.agent_id && call.agent_id !== call.sdr_id) {
        userMap.set(call.agent_id, {
          id: call.agent_id,
          name: `Agente ${call.agent_id}`,
          role: 'agent'
        });
      }
    });
    
    const users = Array.from(userMap.values());
    console.log('✅ fetchUsersFromCalls - Usuários encontrados em calls:', users.length);
    return users;
    
  } catch (error) {
    console.error('❌ fetchUsersFromCalls - Erro:', error);
    return [];
  }
}

// Função de fallback mais simples
async function fetchUsersFromCallsSimple() {
  if (!supabase) return [];
  
  try {
    console.log('🔍 fetchUsersFromCallsSimple - Buscando usuários simples...');
    
    // Query mais simples sem joins complexos
    const { data, error } = await supabase
      .from('calls')
      .select('agent_id, sdr_name')
      .not('agent_id', 'is', null)
      .limit(50);
    
    if (error) {
      console.error('❌ fetchUsersFromCallsSimple - Erro na query:', error);
      return [];
    }
    
    // Criar mapa de usuários únicos
    const userMap = new Map();
    
    data?.forEach(call => {
      if (call.agent_id) {
        userMap.set(call.agent_id, {
          id: call.agent_id,
          name: call.sdr_name || `Usuário ${call.agent_id}`,
          role: 'user'
        });
      }
    });
    
    const users = Array.from(userMap.values());
    console.log('✅ fetchUsersFromCallsSimple - Usuários encontrados:', users.length);
    return users;
    
  } catch (error) {
    console.error('❌ fetchUsersFromCallsSimple - Erro:', error);
    return [];
  }
}

// ---- Salvar análise de chamada ----
export async function saveCallAnalysisToSupabase(callId: string, analysisResult: any) {
  if (!supabase) return null;
  
  try {
    console.log('💾 Salvando análise da chamada:', callId);
    
    // Salvar scorecard na tabela calls
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        scorecard: {
          finalScore: analysisResult.finalScore,
          analysisDate: new Date().toISOString(),
          qualityIndicators: analysisResult.analysis.qualityIndicators,
          version: '2.0'
        },
        ai_status: 'analyzed',
        processed_at: new Date().toISOString()
      })
      .eq('id', callId);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar scorecard:', updateError);
      throw updateError;
    }
    
    // Salvar scores detalhados por critério
    const scoreRecords = analysisResult.criteria.map((criterion: any) => ({
      call_id: callId,
      criterion_id: criterion.id,
      score: criterion.score,
      justification: criterion.justification,
      analysis_version: '2.0',
      created_at: new Date().toISOString()
    }));
    
    // Primeiro, deletar scores antigos desta chamada
    await supabase
      .from('call_scores')
      .delete()
      .eq('call_id', callId);
    
    // Inserir novos scores
    const { error: scoresError } = await supabase
      .from('call_scores')
      .insert(scoreRecords);
    
    if (scoresError) {
      console.warn('⚠️ Erro ao salvar scores detalhados:', scoresError);
      // Não falha a operação principal
    }
    
    console.log('✅ Análise salva com sucesso no Supabase');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao salvar análise:', error);
    throw error;
  }
}

// ---- Métricas com dados reais ----
export function computeRankings(calls: any[], users: any[]) {
  const userStats = new Map();
  
  // Inicializar stats para todos os usuários
  users.forEach(user => {
    userStats.set(user.id, {
      user,
      calls: 0,
      answeredCalls: 0,
      totalDuration: 0,
      totalScore: 0,
      scoreCount: 0
    });
  });
  
  // Processar chamadas
  calls.forEach(call => {
    const userId = call.sdr_id;
    if (!userId || !userStats.has(userId)) return;
    
    const stats = userStats.get(userId);
    stats.calls++;
    
    if (call.status === 'answered' || call.status === 'processed') {
      stats.answeredCalls++;
    }
    
    if (call.duration) {
      stats.totalDuration += call.duration;
    }
    
    // Se houver score na chamada
    if (call.score && typeof call.score === 'number') {
      stats.totalScore += call.score;
      stats.scoreCount++;
    }
  });
  
  // Converter para arrays ordenados
  const scoreRanking = Array.from(userStats.values())
    .map(stats => ({
      user: stats.user,
      calls: stats.calls,
      avgScore: stats.scoreCount > 0 ? Math.round(stats.totalScore / stats.scoreCount) : null
    }))
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    
  const volumeRanking = Array.from(userStats.values())
    .map(stats => ({
      user: stats.user,
      calls: stats.calls
    }))
    .sort((a, b) => b.calls - a.calls);
    
  return { scoreRanking, volumeRanking };
}




