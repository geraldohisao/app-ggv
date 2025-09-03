/**
 * Serviço Backend de Análise de Chamadas
 * Processa análises com IA e salva no banco automaticamente
 */

import { supabase } from '../../services/supabaseClient';
import { analyzeScorecardWithAI, ScorecardAnalysisResult } from './scorecardAnalysisService';

// Interfaces para o banco
interface CallAnalysisRecord {
  id: string;
  call_id: string;
  scorecard_id: string;
  scorecard_name: string;
  overall_score: number;
  max_possible_score: number;
  final_grade: number;
  general_feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number;
  analysis_created_at: string;
  criteria_analysis: any[];
}

interface AnalysisJob {
  call_id: string;
  transcription: string;
  sdr_name?: string;
  client_name?: string;
  priority: 'high' | 'normal' | 'low';
}

// Cache de análises em processamento
const processingCache = new Map<string, Promise<ScorecardAnalysisResult>>();

/**
 * Verifica se uma chamada já tem análise
 */
export async function hasExistingAnalysis(callId: string): Promise<CallAnalysisRecord | null> {
  try {
    const { data, error } = await supabase.rpc('get_call_analysis', {
      p_call_id: callId
    });

    if (error) {
      console.warn('⚠️ Erro ao verificar análise existente:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.warn('⚠️ Erro ao verificar análise:', error);
    return null;
  }
}

/**
 * Salva análise no banco de dados
 */
async function saveAnalysisToDatabase(
  callId: string,
  analysis: ScorecardAnalysisResult
): Promise<string | null> {
  try {
    const startTime = Date.now();
    
    // Preparar dados dos critérios para o banco
    const criteriaData = analysis.criteria_analysis.map(criterion => ({
      criterion_id: criterion.criterion_id,
      achieved_score: criterion.achieved_score,
      max_score: criterion.max_score,
      analysis: criterion.analysis,
      evidence: criterion.evidence || [],
      suggestions: criterion.suggestions || [],
      confidence: criterion.confidence || 0.7
    }));

    const processingTime = Date.now() - startTime;

    // Salvar no banco usando RPC
    const { data, error } = await supabase.rpc('save_call_analysis', {
      p_call_id: callId,
      p_scorecard_id: analysis.scorecard_used.id,
      p_overall_score: analysis.overall_score,
      p_max_possible_score: analysis.max_possible_score,
      p_final_grade: analysis.final_grade,
      p_general_feedback: analysis.general_feedback,
      p_strengths: analysis.strengths,
      p_improvements: analysis.improvements,
      p_confidence: analysis.confidence,
      p_criteria_data: criteriaData,
      p_processing_time_ms: processingTime
    });

    if (error) {
      console.error('❌ Erro ao salvar análise:', error);
      return null;
    }

    console.log('✅ Análise salva no banco:', data);
    return data;

  } catch (error) {
    console.error('❌ Erro ao salvar análise:', error);
    return null;
  }
}

/**
 * Processa análise de uma chamada (principal)
 */
export async function processCallAnalysis(
  callId: string,
  transcription: string,
  sdrName?: string,
  clientName?: string,
  forceReprocess: boolean = false
): Promise<ScorecardAnalysisResult | null> {
  
  console.log('🎯 Iniciando processamento de análise:', { callId, forceReprocess });

  // Verificar se já está sendo processada
  if (processingCache.has(callId)) {
    console.log('⏳ Análise já em processamento, aguardando...');
    return await processingCache.get(callId)!;
  }

  // Verificar se já existe análise (se não forçar reprocessamento)
  if (!forceReprocess) {
    const existing = await hasExistingAnalysis(callId);
    if (existing) {
      console.log('✅ Análise já existe no banco:', existing.final_grade);
      
      // Converter para formato esperado
      return {
        scorecard_used: {
          id: existing.scorecard_id,
          name: existing.scorecard_name,
          description: ''
        },
        overall_score: existing.overall_score,
        max_possible_score: existing.max_possible_score,
        final_grade: existing.final_grade,
        criteria_analysis: existing.criteria_analysis || [],
        general_feedback: existing.general_feedback,
        strengths: existing.strengths || [],
        improvements: existing.improvements || [],
        confidence: existing.confidence
      };
    }
  }

  // Criar promise de processamento
  const processingPromise = (async () => {
    try {
      console.log('🤖 Iniciando análise com IA...');
      
      // Processar com IA
      const analysis = await analyzeScorecardWithAI(
        callId,
        transcription,
        sdrName,
        clientName
      );

      console.log('✅ Análise IA concluída, salvando no banco...');

      // Salvar no banco
      const analysisId = await saveAnalysisToDatabase(callId, analysis);
      
      if (analysisId) {
        console.log('✅ Análise completa salva:', analysisId);
      } else {
        console.warn('⚠️ Análise processada mas não salva no banco');
      }

      return analysis;

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      throw error;
    } finally {
      // Remover do cache
      processingCache.delete(callId);
    }
  })();

  // Adicionar ao cache
  processingCache.set(callId, processingPromise);

  return await processingPromise;
}

/**
 * Busca análise do banco (mais rápido que reprocessar)
 */
export async function getCallAnalysisFromDatabase(callId: string): Promise<ScorecardAnalysisResult | null> {
  try {
    const existing = await hasExistingAnalysis(callId);
    
    if (!existing) {
      return null;
    }

    // Converter para formato esperado
    return {
      scorecard_used: {
        id: existing.scorecard_id,
        name: existing.scorecard_name,
        description: ''
      },
      overall_score: existing.overall_score,
      max_possible_score: existing.max_possible_score,
      final_grade: existing.final_grade,
      criteria_analysis: existing.criteria_analysis || [],
      general_feedback: existing.general_feedback,
      strengths: existing.strengths || [],
      improvements: existing.improvements || [],
      confidence: existing.confidence
    };

  } catch (error) {
    console.error('❌ Erro ao buscar análise do banco:', error);
    return null;
  }
}

/**
 * Processa análise em lote (para múltiplas chamadas)
 */
export async function processBatchAnalysis(
  jobs: AnalysisJob[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number; results: Array<{ callId: string; success: boolean; error?: string }> }> {
  
  console.log('📦 Iniciando processamento em lote:', jobs.length, 'chamadas');
  
  const results: Array<{ callId: string; success: boolean; error?: string }> = [];
  let completed = 0;

  // Processar com limite de concorrência
  const concurrencyLimit = 3;
  const chunks = [];
  
  for (let i = 0; i < jobs.length; i += concurrencyLimit) {
    chunks.push(jobs.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (job) => {
      try {
        await processCallAnalysis(
          job.call_id,
          job.transcription,
          job.sdr_name,
          job.client_name
        );
        
        results.push({ callId: job.call_id, success: true });
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${job.call_id}:`, error);
        results.push({ 
          callId: job.call_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
      
      completed++;
      onProgress?.(completed, jobs.length);
    });

    await Promise.all(promises);
  }

  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('✅ Processamento em lote concluído:', { success, failed });

  return { success, failed, results };
}

/**
 * Limpa cache de processamento
 */
export function clearProcessingCache(): void {
  processingCache.clear();
  console.log('🧹 Cache de processamento limpo');
}

/**
 * Status do processamento
 */
export function getProcessingStatus(): { inProgress: string[]; cacheSize: number } {
  return {
    inProgress: Array.from(processingCache.keys()),
    cacheSize: processingCache.size
  };
}
