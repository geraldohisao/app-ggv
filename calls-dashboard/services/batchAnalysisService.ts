/**
 * Serviço para Análise IA em Lote
 * Processa automaticamente todas as chamadas >3min que não têm análise
 */

import { supabase } from '../../services/supabaseClient';
import { processCallAnalysis } from './callAnalysisBackendService';

export interface BatchAnalysisProgress {
  total: number;
  processed: number;
  current: string;
  errors: number;
  completed: boolean;
}

export interface CallToAnalyze {
  id: string;
  transcription: string;
  duration: number;
  sdr_name?: string;
  enterprise?: string;
  person?: string;
}

/**
 * Calcula duração em segundos a partir dos campos duration/duration_formated
 */
function calculateDurationSeconds(call: any): number {
  if (call.duration_formated && call.duration_formated !== '00:00:00') {
    try {
      const parts = call.duration_formated.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } catch {
      return call.duration || 0;
    }
  }
  return call.duration || 0;
}

/**
 * Busca chamadas que precisam de análise (>3min, com transcrição, sem análise)
 */
export async function getCallsNeedingAnalysis(): Promise<CallToAnalyze[]> {
  try {
    console.log('🔍 Buscando chamadas que precisam de análise...');

    // Buscar chamadas com transcrição e verificar se realmente têm análise
    const { data: calls, error } = await supabase
      .from('calls')
      .select(`
        id,
        transcription,
        duration,
        duration_formated,
        sdr_name,
        enterprise,
        person,
        ai_status,
        call_analysis(call_id)
      `)
      .not('transcription', 'is', null)
      .neq('transcription', '');

    if (error) {
      console.error('❌ Erro ao buscar chamadas:', error);
      throw error;
    }

    const callsToAnalyze = (calls || []).filter(call => {
      // Verificar duração >3min usando função auxiliar
      const durationSec = calculateDurationSeconds(call);
      
      // Verificar se realmente não tem análise (verificar na tabela call_analysis)
      const hasAnalysis = call.call_analysis && call.call_analysis.length > 0;
      
      const isValid = durationSec > 180 && 
             call.transcription && 
             call.transcription.trim().length > 50 &&
             !hasAnalysis; // Sem análise na tabela call_analysis
      
      if (isValid) {
        console.log(`✅ Chamada válida para análise: ${call.id} - ${durationSec}s - sem análise prévia`);
      } else {
        console.log(`❌ Chamada filtrada: ${call.id} - duração: ${durationSec}s - tem análise: ${hasAnalysis} - ai_status: ${call.ai_status}`);
      }
      
      return isValid;
    });

    console.log(`📊 Encontradas ${callsToAnalyze.length} chamadas para análise`);
    return callsToAnalyze;

  } catch (error) {
    console.error('💥 Erro ao buscar chamadas para análise:', error);
    throw error;
  }
}

/**
 * Processa análise IA em lote com callback de progresso
 */
export async function processBatchAnalysis(
  onProgress?: (progress: BatchAnalysisProgress) => void
): Promise<BatchAnalysisProgress> {
  try {
    const callsToAnalyze = await getCallsNeedingAnalysis();
    const total = callsToAnalyze.length;

    if (total === 0) {
      const finalProgress: BatchAnalysisProgress = {
        total: 0,
        processed: 0,
        current: 'Nenhuma chamada encontrada',
        errors: 0,
        completed: true
      };
      onProgress?.(finalProgress);
      return finalProgress;
    }

    let processed = 0;
    let errors = 0;

    console.log(`🚀 Iniciando análise em lote de ${total} chamadas...`);

    // Processar em lotes de 5 para não sobrecarregar a API
    const batchSize = 5;
    for (let i = 0; i < callsToAnalyze.length; i += batchSize) {
      const batch = callsToAnalyze.slice(i, i + batchSize);
      
      // Processar lote atual
      await Promise.allSettled(
        batch.map(async (call) => {
          try {
            const progress: BatchAnalysisProgress = {
              total,
              processed,
              current: `${call.enterprise || 'Empresa'} - ${call.sdr_name || 'SDR'}`,
              errors,
              completed: false
            };
            onProgress?.(progress);

            console.log(`🤖 Analisando chamada ${call.id}...`);
            
            const analysis = await processCallAnalysis(
              call.id,
              call.transcription,
              call.sdr_name || 'SDR',
              call.person || call.enterprise || 'Cliente',
              false // forceReprocess
            );

            if (analysis) {
              // Atualizar tabela calls com o score (escala 0-10)
              await supabase
                .from('calls')
                .update({ 
                  scorecard: { final_score: analysis.final_grade }, // Manter 0-10
                  ai_status: 'completed'
                })
                .eq('id', call.id);

              console.log(`✅ Chamada ${call.id} analisada: ${analysis.final_grade.toFixed(1)}`);
            }

            processed++;
          } catch (error) {
            console.error(`❌ Erro ao analisar chamada ${call.id}:`, error);
            errors++;
            processed++;
          }
        })
      );

      // Pequena pausa entre lotes para não sobrecarregar
      if (i + batchSize < callsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const finalProgress: BatchAnalysisProgress = {
      total,
      processed,
      current: 'Análise em lote concluída',
      errors,
      completed: true
    };

    console.log(`🎉 Análise em lote concluída: ${processed - errors}/${total} sucessos`);
    onProgress?.(finalProgress);
    return finalProgress;

  } catch (error) {
    console.error('💥 Erro na análise em lote:', error);
    throw error;
  }
}

/**
 * Verifica quantas chamadas precisam de análise
 */
export async function getAnalysisStats(): Promise<{
  totalCalls: number;
  callsOver3Min: number;
  callsWithTranscription: number;
  callsNeedingAnalysis: number;
  callsAnalyzed: number;
  callsWithScore: number;
}> {
  try {
    // USAR A FUNÇÃO CORRIGIDA COM DADOS REAIS
    const { data: statsData, error: statsErr } = await supabase.rpc('get_analysis_stats_real');
    
    if (statsErr) throw statsErr;
    
    const stats = Array.isArray(statsData) ? statsData[0] : statsData;
    
    return {
      totalCalls: Number(stats?.total_calls || 0),
      callsOver3Min: Number(stats?.calls_over_3min || 0),
      callsWithTranscription: Number(stats?.calls_with_transcription || 0),
      callsNeedingAnalysis: Number(stats?.calls_needing_analysis || 0),
      callsAnalyzed: Number(stats?.calls_analyzed || 0),
      callsWithScore: Number(stats?.calls_with_score || 0)
    };

    // Usar estatística da RPC para chamadas com transcrição
    const callsWithTranscription = Number(stats?.calls_with_transcription || 0);

    // Chamadas que precisam de análise (mesma lógica do getCallsNeedingAnalysis)
    const { data: callsNeedingData } = await supabase
      .from('calls')
      .select('duration, duration_formated, transcription, ai_status')
      .not('transcription', 'is', null)
      .neq('transcription', '');
    
    const callsNeedingAnalysis = (callsNeedingData || []).filter(call => {
      const durationSec = calculateDurationSeconds(call);
      return durationSec > 180 && 
             call.transcription && 
             call.transcription.trim().length > 50 &&
             call.ai_status !== 'completed'; // Sem análise ainda
    }).length;

    // Chamadas já analisadas
    const { count: callsAnalyzed } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('ai_status', 'completed');

    // Chamadas com notas (score) - usar MESMA lógica do ranking SQL
    const { data: callsWithScoreData } = await supabase
      .from('calls')
      .select(`
        id,
        call_analysis!inner(final_grade)
      `)
      .not('call_analysis.final_grade', 'is', null);
    
    const callsWithScore = (callsWithScoreData || []).length;

    console.log('📊 STATS DEBUG:', {
      totalCalls: stats?.total_calls || 0,
      callsOver3Min: stats?.calls_over_3min || 0,
      callsWithTranscription: callsWithTranscription || 0,
      callsNeedingAnalysis: stats?.calls_needing_analysis || 0,
      callsAnalyzed: stats?.calls_analyzed || 0,
      callsWithScore: callsWithScore || 0
    });

    return {
      totalCalls: Number(stats?.total_calls || 0),
      callsOver3Min: Number(stats?.calls_over_3min || 0),
      callsWithTranscription: callsWithTranscription || 0,
      callsNeedingAnalysis: Number(stats?.calls_needing_analysis || 0),
      callsAnalyzed: Number(stats?.calls_analyzed || 0),
      callsWithScore: callsWithScore || 0
    };

  } catch (error) {
    console.error('💥 Erro ao buscar estatísticas:', error);
    throw error;
  }
}
