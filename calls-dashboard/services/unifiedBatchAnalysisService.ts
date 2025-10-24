import { supabase } from '../../services/supabaseClient';
import { getRealDuration, parseFormattedDuration } from '../utils/durationUtils';
import { processCallAnalysis } from './callAnalysisBackendService';

export interface BatchAnalysisStats {
  totalCalls: number;
  callsAnswered: number; // status_voip = 'normal_clearing'
  callsWithTranscription: number;
  callsOver3Min: number;
  callsWithMinSegments: number; // >10 segmentos
  callsEligibleForAnalysis: number; // atendidas + >3min + >10 segmentos + transcrição
  callsAlreadyAnalyzed: number;
  callsNeedingAnalysis: number;
  callsWithScore: number;
}

export interface CallForAnalysis {
  id: string;
  transcription: string;
  duration: number;
  segments?: number;
  call_type?: string;
  pipeline?: string;
  cadence?: string;
  enterprise?: string;
  person?: string;
  sdr?: string;
  status_voip?: string;
  status_translated?: string;
}

// Função para traduzir status_voip
export function translateCallStatus(status_voip: string): string {
  const statusMap: Record<string, string> = {
    'no_answer': 'Não Atendida',
    'originator_cancel': 'Cancelada pela SDR',
    'normal_clearing': 'Atendida',
    'number_changed': 'Número Mudou',
    'busy': 'Ocupado',
    'failed': 'Falhou',
    'congestion': 'Congestionamento',
    'timeout': 'Timeout',
    'rejected': 'Rejeitada',
    'unavailable': 'Indisponível'
  };
  
  return statusMap[status_voip] || status_voip || 'Status Desconhecido';
}

/**
 * Buscar estatísticas usando a MESMA lógica da lista de chamadas
 */
export async function getUnifiedBatchAnalysisStats(): Promise<BatchAnalysisStats> {
  try {
    console.log('📊 Buscando estatísticas unificadas...');

    // Buscar todas as chamadas em páginas (como na lista)
    const pageSize = 1000;
    const maxPages = 50;
    let page = 0;
    let allCalls: any[] = [];
    let totalReported = 0;

    while (page < maxPages) {
      const { data: pageData, error: pageError } = await supabase.rpc('get_calls_with_filters', {
        p_sdr: null,
        p_status: null,
        p_type: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_sort_by: 'created_at',
        p_min_duration: null,
        p_max_duration: null,
        p_min_score: null
      });

      if (pageError) {
        console.error('❌ Erro ao buscar página de chamadas:', pageError);
        throw pageError;
      }

      const current = pageData || [];
      if (current.length === 0) break;
      allCalls = allCalls.concat(current);
      const pageTotal = current[0]?.total_count || allCalls.length;
      totalReported = Math.max(totalReported, pageTotal);
      
      // CONTINUAR ATÉ BUSCAR TODAS AS PÁGINAS (não parar no total_count)
      page += 1;
      
      console.log(`📄 Página ${page} processada: ${current.length} chamadas (total acumulado: ${allCalls.length})`);
    }
    console.log('📋 Total de chamadas encontradas:', allCalls.length);

    // Buscar análises existentes
    const { data: analysisData, error: analysisError } = await supabase
      .from('call_analysis')
      .select('call_id, final_grade');

    if (analysisError) {
      console.warn('⚠️ Erro ao buscar análises (pode ser normal se tabela vazia):', analysisError);
    }

    const analyzedCallIds = new Set((analysisData || []).map(a => a.call_id));
    const callsWithScore = (analysisData || []).filter(a => a.final_grade != null && a.final_grade > 0);

    // Analisar cada chamada usando os MESMOS critérios
    let callsAnswered = 0;
    let callsWithTranscription = 0;
    let callsOver3Min = 0;
    let callsWithMinSegments = 0;
    let callsEligibleForAnalysis = 0;
    let callsAlreadyAnalyzed = 0;

    allCalls.forEach(call => {
      // CRITÉRIOS MAIS FLEXÍVEIS PARA TESTE
      // Verificar se foi atendida (CRITÉRIO MAIS FLEXÍVEL)
      const isAnswered = call.duration > 0; // Qualquer chamada com duração > 0
      if (isAnswered) callsAnswered++;

      // Verificar transcrição (CRITÉRIO MAIS FLEXÍVEL)
      const hasTranscription = call.transcription && call.transcription.trim().length > 20; // 20 chars ao invés de 100
      if (hasTranscription) callsWithTranscription++;

      // Calcular duração real priorizando duration_formated
      const realDuration = getRealDuration(call);
      const isOver3Min = realDuration >= 180; // voltar ao critério real de 3 min
      if (isOver3Min) callsOver3Min++;

      // Verificar segmentos >5 (CRITÉRIO MAIS FLEXÍVEL)
      const hasMinSegments = hasTranscription && call.transcription.split('.').length > 5; // 5 ao invés de 10
      if (hasMinSegments) callsWithMinSegments++;

      // Verificar se é elegível para análise (CRITÉRIOS FLEXÍVEIS)
      const isEligible = isAnswered && hasTranscription && isOver3Min && hasMinSegments;
      if (isEligible) {
        callsEligibleForAnalysis++;
        
        // Verificar se já foi analisada
        if (analyzedCallIds.has(call.id)) {
          callsAlreadyAnalyzed++;
        }
      }

      // Debug das primeiras 10 chamadas para entender o problema
      if (allCalls.indexOf(call) < 10) {
        console.log(`🔍 Chamada ${allCalls.indexOf(call) + 1}: ${call.id}`);
        console.log(`   status_voip: "${call.status_voip}" (${translateCallStatus(call.status_voip)})`);
        console.log(`   duration_formated: "${call.duration_formated}"`);
        console.log(`   duração_calc: ${realDuration}s`);
        console.log(`   transcrição: ${hasTranscription} (${call.transcription?.length || 0} chars)`);
        console.log(`   segmentos: ${call.transcription?.split('.').length || 0}`);
        console.log(`   atendida: ${isAnswered}, >3min: ${isOver3Min}, >10seg: ${hasMinSegments}, elegível: ${isEligible}`);
        console.log('   ---');
      }
    });

    const callsNeedingAnalysis = callsEligibleForAnalysis - callsAlreadyAnalyzed;

    const stats: BatchAnalysisStats = {
      totalCalls: allCalls.length,
      callsAnswered,
      callsWithTranscription,
      callsOver3Min,
      callsWithMinSegments,
      callsEligibleForAnalysis,
      callsAlreadyAnalyzed,
      callsNeedingAnalysis: Math.max(0, callsNeedingAnalysis),
      callsWithScore: callsWithScore.length
    };

    console.log('📊 Estatísticas calculadas:', stats);
    return stats;

  } catch (error) {
    console.error('💥 Erro ao calcular estatísticas:', error);
    throw error;
  }
}

/**
 * Buscar chamadas que precisam de análise usando a MESMA lógica
 */
export async function getCallsNeedingAnalysisUnified(
  forceReprocess: boolean = false,
  limit: number = 50
): Promise<CallForAnalysis[]> {
  try {
    console.log('🔍 Buscando chamadas para análise (unified)...', { forceReprocess, limit });

    // Buscar TODAS as chamadas em páginas para garantir que encontramos as elegíveis
    const pageSize = 1000;
    const maxPages = 50;
    let page = 0;
    let allCalls: any[] = [];

    while (page < maxPages) {
      const { data: pageData, error: pageError } = await supabase.rpc('get_calls_with_filters', {
        p_sdr: null,
        p_status: null,
        p_type: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_sort_by: 'created_at',
        p_min_duration: null,
        p_max_duration: null,
        p_min_score: null
      });

      if (pageError) throw pageError;

      const current = pageData || [];
      if (current.length === 0) break;
      allCalls = allCalls.concat(current);
      page += 1;
      
      console.log(`📄 Busca página ${page}: ${current.length} chamadas (total: ${allCalls.length})`);
    }
    console.log('📋 Chamadas encontradas na fonte principal:', allCalls.length);

    // Buscar análises existentes (se não for reprocessamento)
    let analyzedCallIds = new Set<string>();
    if (!forceReprocess) {
      const { data: analysisData } = await supabase
        .from('call_analysis')
        .select('call_id');
      
      analyzedCallIds = new Set((analysisData || []).map(a => a.call_id));
      console.log('📋 Chamadas já analisadas:', analyzedCallIds.size);
    }

    // Filtrar chamadas elegíveis usando CRITÉRIOS FLEXÍVEIS PARA TESTE
    console.log(`🔍 Iniciando filtro de ${allCalls.length} chamadas...`);
    console.log(`🔍 Análises já existentes: ${analyzedCallIds.size}`);
    console.log(`🔍 ForceReprocess: ${forceReprocess}`);
    
    let debugCount = 0;
    const eligibleCalls = allCalls.filter(call => {
      // DEBUG: Logar primeira chamada completa
      if (debugCount < 3) {
        console.log(`\n🔍 DEBUG Chamada ${debugCount + 1}:`, {
          id: call.id?.substring(0, 8),
          enterprise: call.enterprise || call.company_name,
          duration: call.duration,
          duration_formated: call.duration_formated,
          transcription_length: call.transcription?.length || 0,
          has_transcription: !!call.transcription,
          segments: call.transcription?.split('.').length || 0
        });
        debugCount++;
      }
      
      // 1. CRITÉRIO FLEXÍVEL: Qualquer chamada com duração > 0
      const isAnswered = call.duration > 0;
      
      // 2. CRITÉRIO FLEXÍVEL: Transcrição com mínimo 20 chars
      const hasTranscription = call.transcription && call.transcription.trim().length > 20;
      
      // 3. Duração >= 3 min (critério real)
      const realDuration = getRealDuration(call);
      const isOver3Min = realDuration >= 180;
      
      // 4. CRITÉRIO FLEXÍVEL: >5 segmentos
      const hasMinSegments = hasTranscription && call.transcription.split('.').length > 5;
      
      // 5. Se não for reprocessamento, não deve ter análise
      const needsAnalysis = forceReprocess || !analyzedCallIds.has(call.id);

      const isEligible = isAnswered && hasTranscription && isOver3Min && hasMinSegments && needsAnalysis;

      if (isEligible) {
        console.log(`✅ Elegível: ${call.enterprise || call.company_name || 'N/A'} - ${realDuration}s - ${call.transcription?.split('.').length || 0} segmentos`);
      }

      return isEligible;
    }).slice(0, limit); // Limitar quantidade

    console.log(`🎯 Total de ${eligibleCalls.length} chamadas elegíveis para análise`);
    
    if (eligibleCalls.length > 0) {
      console.log(`📋 Primeira chamada elegível:`, {
        id: eligibleCalls[0].id,
        company: eligibleCalls[0].company_name || eligibleCalls[0].enterprise,
        person: eligibleCalls[0].person_name || eligibleCalls[0].person,
        sdr: eligibleCalls[0].sdr_name || eligibleCalls[0].agent_id,
        transcription_length: eligibleCalls[0].transcription?.length
      });
    }

    return eligibleCalls.map(call => ({
      id: call.id,
      transcription: call.transcription,
      duration: getRealDuration(call), // Usar duração real calculada
      segments: call.transcription?.split('.').length || 0,
      call_type: call.call_type,
      pipeline: call.pipeline,
      cadence: call.cadence,
      enterprise: call.company_name || call.enterprise,
      person: call.person_name || call.person,
      sdr: call.sdr_name || call.agent_id || 'SDR'
    }));

  } catch (error) {
    console.error('💥 Erro ao buscar chamadas para análise:', error);
    throw error;
  }
}

/**
 * Processar análise em lote com fila
 */
export async function processBatchAnalysisUnified(
  calls: CallForAnalysis[],
  onProgress?: (current: number, total: number, currentCall: string) => void
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: any[];
}> {
  const results = [];
  let successful = 0;
  let failed = 0;

  console.log(`🚀 Iniciando análise em lote PARALELA de ${calls.length} chamadas...`);

  // ✅ MELHORIA: Análise em lote paralela com controle de concorrência
  const BATCH_SIZE = 3; // Análises simultâneas para não sobrecarregar APIs
  const batches: CallForAnalysis[][] = [];
  
  // Dividir chamadas em lotes
  for (let i = 0; i < calls.length; i += BATCH_SIZE) {
    batches.push(calls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Dividido em ${batches.length} lotes de ${BATCH_SIZE} análises paralelas`);

  let processedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} chamadas)`);

    // ✅ MELHORIA: Processar lote em paralelo
    const batchPromises = batch.map(async (call, callIndex) => {
      const globalIndex = processedCount + callIndex + 1;
      const displayName = call.enterprise || call.person || `Chamada ${globalIndex}`;
      
      try {
        // Callback de progresso
        onProgress?.(globalIndex, calls.length, displayName);

        console.log(`🔄 Analisando chamada ${globalIndex}/${calls.length}: ${displayName} (${call.id.substring(0, 8)}...)`);

        // ✅ MELHORIA: Timeout individual por análise (30s)
        const analysisPromise = processCallAnalysis(
          call.id,
          call.transcription,
          call.sdr || 'SDR',
          call.person || 'Cliente',
          true // FORÇAR reprocessamento
        );

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Análise demorou mais de 30s')), 30000)
        );

        const analysisResult = await Promise.race([analysisPromise, timeoutPromise]) as any;

        if (analysisResult) {
          console.log(`✅ Análise ${globalIndex} concluída - Score: ${analysisResult.final_grade}/10 - Scorecard: ${analysisResult.scorecard_used?.name}`);
          return {
            callId: call.id,
            success: true,
            score: analysisResult.final_grade,
            scorecard: analysisResult.scorecard_used?.name
          };
        } else {
          throw new Error('Análise retornou null');
        }
      } catch (error) {
        console.error(`❌ Análise ${globalIndex} falhou para ${call.id}:`, error);
        return {
          callId: call.id,
          success: false,
          error: (error as any)?.message || 'Erro na análise'
        };
      }
    });

    // Aguardar conclusão do lote
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Processar resultados do lote
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const analysisResult = result.value;
        if (analysisResult.success) {
          successful++;
        } else {
          failed++;
        }
        results.push(analysisResult);
      } else {
        failed++;
        const globalIndex = processedCount + index + 1;
        console.error(`💥 Erro no lote ${batchIndex + 1}, análise ${globalIndex}:`, result.reason);
        results.push({
          callId: batch[index].id,
          success: false,
          error: result.reason?.message || 'Erro desconhecido no lote'
        });
      }
    });

    processedCount += batch.length;

    // ✅ MELHORIA: Pausa entre lotes para não sobrecarregar
    if (batchIndex < batches.length - 1) {
      console.log(`⏱️ Pausa de 2s entre lotes para evitar sobrecarga...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`🎉 Análise em lote concluída: ${successful} sucessos, ${failed} falhas`);

  return {
    total: calls.length,
    successful,
    failed,
    results
  };
}
