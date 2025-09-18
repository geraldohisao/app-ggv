import { supabase } from '../../services/supabaseClient';
import { getRealDuration, parseFormattedDuration } from '../utils/durationUtils';

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

    // USAR RPC QUE RETORNA TODAS AS CHAMADAS (sem paginação)
    const { data: allCallsData, error: callsError } = await supabase.rpc('get_calls_complete');

    if (callsError) {
      console.error('❌ Erro ao buscar chamadas:', callsError);
      throw callsError;
    }

    const allCalls = allCallsData || [];
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
      // Verificar se foi atendida (CRITÉRIO ESSENCIAL)
      const isAnswered = call.status_voip === 'normal_clearing';
      if (isAnswered) callsAnswered++;

      // Verificar transcrição (MESMA LÓGICA DA LISTA)
      const hasTranscription = call.transcription && call.transcription.trim().length > 100;
      if (hasTranscription) callsWithTranscription++;

      // Verificar duração >3min (USAR getRealDuration IGUAL À LISTA)
      const realDuration = getRealDuration(call);
      const isOver3Min = realDuration >= 180;
      if (isOver3Min) callsOver3Min++;

      // Verificar segmentos >10 (usar transcrição como proxy)
      const hasMinSegments = hasTranscription && call.transcription.split('.').length > 10;
      if (hasMinSegments) callsWithMinSegments++;

      // Verificar se é elegível para análise (CRITÉRIOS COMPLETOS)
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

    // USAR RPC QUE RETORNA TODAS AS CHAMADAS
    const { data: allCallsData, error: callsError } = await supabase.rpc('get_calls_complete');

    if (callsError) throw callsError;

    const allCalls = allCallsData || [];
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

    // Filtrar chamadas elegíveis usando CRITÉRIOS UNIFICADOS (MESMA LÓGICA DA LISTA)
    const eligibleCalls = allCalls.filter(call => {
      // 1. Deve ter sido atendida (CRITÉRIO ESSENCIAL)
      const isAnswered = call.status_voip === 'normal_clearing';
      
      // 2. Deve ter transcrição válida
      const hasTranscription = call.transcription && call.transcription.trim().length > 100;
      
      // 3. Deve ter duração >3min (USAR getRealDuration IGUAL À LISTA)
      const realDuration = getRealDuration(call);
      const isOver3Min = realDuration >= 180;
      
      // 4. Deve ter >10 segmentos (usar pontos como proxy)
      const hasMinSegments = hasTranscription && call.transcription.split('.').length > 10;
      
      // 5. Se não for reprocessamento, não deve ter análise
      const needsAnalysis = forceReprocess || !analyzedCallIds.has(call.id);

      const isEligible = isAnswered && hasTranscription && isOver3Min && hasMinSegments && needsAnalysis;

      if (isEligible) {
        console.log(`✅ Chamada elegível: ${call.id} - ${translateCallStatus(call.status_voip)} - ${realDuration}s - ${call.transcription?.split('.').length || 0} segmentos`);
      }

      return isEligible;
    }).slice(0, limit); // Limitar quantidade

    console.log(`🎯 Chamadas elegíveis para análise: ${eligibleCalls.length}`);

    return eligibleCalls.map(call => ({
      id: call.id,
      transcription: call.transcription,
      duration: getRealDuration(call), // Usar duração real calculada
      segments: call.transcription?.split('.').length || 0,
      call_type: call.call_type,
      pipeline: call.pipeline,
      cadence: call.cadence,
      enterprise: call.enterprise,
      person: call.person,
      sdr: call.sdr
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

  console.log(`🚀 Iniciando análise em lote de ${calls.length} chamadas...`);

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    
    try {
      // Callback de progresso
      onProgress?.(i + 1, calls.length, call.enterprise || call.id);

      console.log(`🔄 Analisando chamada ${i + 1}/${calls.length}: ${call.id} (${call.enterprise || 'Sem empresa'})`);

      // Usar a função de análise otimizada
      const { data: result, error } = await supabase.rpc('perform_ultra_fast_ai_analysis', {
        call_id_param: call.id
      });

      console.log(`📡 Resposta da RPC para ${call.id}:`, { result, error });

      if (error) {
        console.error(`❌ Erro na RPC para ${call.id}:`, error);
        throw error;
      }

      if (result?.success) {
        successful++;
        console.log(`✅ Análise ${i + 1} concluída - Score: ${result.overall_score}/10 - Scorecard: ${result.scorecard?.name}`);
        results.push({
          callId: call.id,
          success: true,
          score: result.overall_score,
          scorecard: result.scorecard?.name
        });
      } else {
        failed++;
        console.error(`❌ Análise ${i + 1} falhou para ${call.id}:`, result?.message || 'Sem mensagem de erro');
        console.error(`   Dados da chamada:`, {
          duration: call.duration,
          transcription_length: call.transcription?.length,
          segments: call.segments,
          status_voip: call.status_voip
        });
        results.push({
          callId: call.id,
          success: false,
          error: result?.message || 'Falha sem mensagem específica'
        });
      }

      // Pequena pausa para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failed++;
      console.error(`💥 Erro na análise ${i + 1}:`, error);
      results.push({
        callId: call.id,
        success: false,
        error: (error as any)?.message || 'Erro desconhecido'
      });
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
