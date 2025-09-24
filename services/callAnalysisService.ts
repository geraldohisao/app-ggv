// services/callAnalysisService.ts
// Serviço especializado em análise de IA para ligações por deal

import { supabase } from './supabaseClient';
import { getAIAssistantResponseStream } from './geminiService';

export interface CallTranscription {
  call_id: string;
  provider_call_id: string;
  from_number: string;
  to_number: string;
  agent_id: string;
  direction: string;
  call_type: string;
  duration: number;
  transcription: string;
  insights: any;
  scorecard: any;
  created_at: string;
  call_status: string;
}

export interface DealCallStats {
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  successful_calls: number;
  first_call_date: string;
  last_call_date: string;
  call_types: Record<string, number>;
  agents_involved: Record<string, number>;
}

export interface CallAnalysisResult {
  deal_id: string;
  analysis_content: string;
  transcription_summary: string;
  call_count: number;
  total_duration: number;
  created_at: string;
}

/**
 * Busca todas as transcrições de um deal específico
 */
export async function getDealTranscriptions(dealId: string): Promise<CallTranscription[]> {
  try {
    console.log('🔍 CALL ANALYSIS - Buscando transcrições para deal:', dealId);
    
    const { data, error } = await supabase.rpc('get_deal_transcriptions_direct', {
      p_deal_id: dealId
    });

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao buscar transcrições:', error);
      throw new Error(`Erro ao buscar transcrições: ${error.message}`);
    }

    console.log('✅ CALL ANALYSIS - Transcrições encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao buscar transcrições:', error);
    throw error;
  }
}

/**
 * Busca estatísticas das ligações de um deal
 */
export async function getDealCallStats(dealId: string): Promise<DealCallStats | null> {
  try {
    console.log('📊 CALL ANALYSIS - Buscando estatísticas para deal:', dealId);
    
    const { data, error } = await supabase.rpc('get_deal_call_stats', {
      p_deal_id: dealId
    });

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao buscar estatísticas:', error);
      return null;
    }

    console.log('✅ CALL ANALYSIS - Estatísticas encontradas:', data?.[0]);
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao buscar estatísticas:', error);
    return null;
  }
}

/**
 * Gera análise completa das ligações de um deal usando IA
 */
export async function* analyzeDealCallsWithAI(
  dealId: string,
  customPrompt?: string
): AsyncGenerator<string, void, unknown> {
  try {
    console.log('🤖 CALL ANALYSIS - Iniciando análise IA para deal:', dealId);

    // 1. Buscar transcrições e estatísticas
    const [transcriptions, stats] = await Promise.all([
      getDealTranscriptions(dealId),
      getDealCallStats(dealId)
    ]);

    if (!transcriptions || transcriptions.length === 0) {
      yield '❌ **Nenhuma transcrição encontrada**\n\nEste deal não possui ligações com transcrições disponíveis para análise.';
      return;
    }

    console.log('📝 CALL ANALYSIS - Processando', transcriptions.length, 'transcrições');

    // 2. Preparar contexto para a IA
    const contextData = prepareAnalysisContext(transcriptions, stats, dealId);
    
    // 3. Buscar persona especializada
    const analystPersona = await getCallAnalystPersona();
    if (!analystPersona) {
      yield '❌ **Erro de configuração**\n\nA persona de análise de ligações não está configurada.';
      return;
    }

    // 4. Preparar prompt personalizado ou usar padrão
    const analysisPrompt = customPrompt || generateDefaultAnalysisPrompt(contextData);

    // 5. Gerar análise com IA
    console.log('🧠 CALL ANALYSIS - Gerando análise com IA...');
    
    let fullAnalysisContent = '';
    for await (const chunk of getAIAssistantResponseStream(
      analysisPrompt,
      analystPersona,
      [], // sem histórico para análise
      contextData.transcriptionContext,
      { requestId: `call_analysis_${dealId}_${Date.now()}` }
    )) {
      fullAnalysisContent += chunk;
      yield chunk;
    }

    // 6. Salvar análise permanentemente no histórico
    await saveAnalysisToHistory(dealId, fullAnalysisContent, contextData, customPrompt);

  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro na análise:', error);
    yield `❌ **Erro na análise**\n\nOcorreu um erro ao analisar as ligações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
  }
}

/**
 * Prepara o contexto para análise das transcrições
 */
function prepareAnalysisContext(
  transcriptions: CallTranscription[], 
  stats: DealCallStats | null, 
  dealId: string
): {
  transcriptionContext: string;
  summaryData: any;
} {
  const transcriptionContext = transcriptions
    .map((call, index) => {
      const callDate = new Date(call.created_at).toLocaleDateString('pt-BR');
      const callDuration = Math.round(call.duration / 60); // em minutos
      
      return `[#src:call_${index + 1}]
**LIGAÇÃO ${index + 1} - ${callDate}**
- **ID**: ${call.provider_call_id}
- **Direção**: ${call.direction}
- **Tipo**: ${call.call_type || 'N/A'}
- **Duração**: ${callDuration} minutos
- **Agente**: ${call.agent_id}
- **Status**: ${call.call_status}

**TRANSCRIÇÃO:**
${call.transcription}

${call.insights && Object.keys(call.insights).length > 0 ? `
**INSIGHTS EXISTENTES:**
${JSON.stringify(call.insights, null, 2)}
` : ''}

---`;
    })
    .join('\n\n');

  const summaryData = {
    deal_id: dealId,
    total_calls: stats?.total_calls || transcriptions.length,
    total_duration: stats?.total_duration || transcriptions.reduce((sum, call) => sum + call.duration, 0),
    avg_duration: stats?.avg_duration || 0,
    successful_calls: stats?.successful_calls || transcriptions.length,
    first_call_date: stats?.first_call_date || transcriptions[0]?.created_at,
    last_call_date: stats?.last_call_date || transcriptions[transcriptions.length - 1]?.created_at,
    call_types: stats?.call_types || {},
    agents_involved: stats?.agents_involved || {}
  };

  return {
    transcriptionContext,
    summaryData
  };
}

/**
 * Gera prompt padrão para análise
 */
function generateDefaultAnalysisPrompt(contextData: any): string {
  return `Analise todas as ligações deste deal e forneça uma visão estratégica completa.

**CONTEXTO DO DEAL:**
- Total de ligações: ${contextData.summaryData.total_calls}
- Duração total: ${Math.round(contextData.summaryData.total_duration / 60)} minutos
- Período: ${new Date(contextData.summaryData.first_call_date).toLocaleDateString('pt-BR')} a ${new Date(contextData.summaryData.last_call_date).toLocaleDateString('pt-BR')}

**Solicito uma análise que inclua:**

1. **Resumo Executivo** - Visão geral do relacionamento comercial
2. **Progressão do Deal** - Como evoluiu ao longo das ligações
3. **Objeções Identificadas** - Principais preocupações do cliente
4. **Oportunidades** - Momentos de oportunidade perdidos ou aproveitados
5. **Qualidade da Abordagem** - Efetividade das estratégias do vendedor
6. **Próximos Passos** - Recomendações estratégicas baseadas no histórico

**Transcrições para análise:**
${contextData.transcriptionContext}`;
}

/**
 * Busca a persona especializada em análise de ligações
 */
async function getCallAnalystPersona() {
  try {
    const { data, error } = await supabase
      .from('ai_personas')
      .select('*')
      .eq('id', 'call_analyst')
      .single();

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao buscar persona:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao buscar persona:', error);
    return null;
  }
}

/**
 * Salva a análise permanentemente no histórico
 */
async function saveAnalysisToHistory(
  dealId: string, 
  analysisContent: string,
  contextData: any, 
  customPrompt?: string
): Promise<string | null> {
  try {
    console.log('💾 CALL ANALYSIS - Salvando análise permanentemente para deal:', dealId);

    const { data, error } = await supabase.rpc('save_analysis_permanent', {
      p_deal_id: dealId,
      p_analysis_content: analysisContent,
      p_transcription_summary: `Total: ${contextData.summaryData.total_calls} ligações, ${Math.round(contextData.summaryData.total_duration / 60)} minutos`,
      p_call_count: contextData.summaryData.total_calls,
      p_total_duration: contextData.summaryData.total_duration,
      p_custom_prompt: customPrompt || null
    });

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao salvar no histórico:', error);
      return null;
    } else {
      console.log('✅ CALL ANALYSIS - Análise salva permanentemente, ID:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao salvar no histórico:', error);
    return null;
  }
}

/**
 * Busca a última análise do histórico
 */
export async function getLatestAnalysis(dealId: string): Promise<CallAnalysisResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_latest_analysis', {
      p_deal_id: dealId
    });

    if (error) {
      console.log('ℹ️ CALL ANALYSIS - Nenhuma análise no histórico encontrada');
      return null;
    }

    console.log('✅ CALL ANALYSIS - Última análise encontrada:', data?.[0]?.id);
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro ao buscar histórico:', error);
    return null;
  }
}

/**
 * Busca todo o histórico de análises de um deal
 */
export async function getAnalysisHistory(dealId: string): Promise<CallAnalysisResult[]> {
  try {
    const { data, error } = await supabase.rpc('get_deal_analysis_history', {
      p_deal_id: dealId
    });

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao buscar histórico:', error);
      return [];
    }

    console.log('✅ CALL ANALYSIS - Histórico encontrado:', data?.length || 0, 'análises');
    return data || [];
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao buscar histórico:', error);
    return [];
  }
}

/**
 * Limpa análises expiradas do cache
 */
export async function cleanupExpiredAnalyses(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_call_analysis');

    if (error) {
      console.error('❌ CALL ANALYSIS - Erro ao limpar cache:', error);
      return 0;
    }

    console.log('🧹 CALL ANALYSIS - Análises expiradas removidas:', data || 0);
    return data || 0;
  } catch (error) {
    console.error('❌ CALL ANALYSIS - Erro geral ao limpar cache:', error);
    return 0;
  }
}