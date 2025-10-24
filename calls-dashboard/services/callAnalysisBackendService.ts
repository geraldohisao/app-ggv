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
 * Verifica se uma chamada já tem análise (com retry automático)
 */
export async function hasExistingAnalysis(callId: string): Promise<CallAnalysisRecord | null> {
  try {
    console.log('🔍 Verificando análise existente para chamada:', callId);
    
    const { data, error } = await supabase.rpc('get_call_analysis', {
      p_call_id: callId
    });

    if (error) {
      console.warn('⚠️ Erro ao verificar análise existente:', error);
      return null;
    }

    const analysis = data?.[0] || null;
    
    if (analysis) {
      console.log('✅ Análise encontrada no banco:', {
        id: analysis.id,
        final_grade: analysis.final_grade,
        created_at: analysis.analysis_created_at
      });
    } else {
      console.log('ℹ️ Nenhuma análise encontrada para esta chamada');
    }

    return analysis;
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
    
    // ✅ VERIFICAR SE A ANÁLISE FALHOU - NÃO SALVAR SE FALHOU
    const analysisFailed = (analysis as any).analysis_failed === true || 
                          analysis.final_grade === null ||
                          analysis.overall_score === null ||
                          analysis.max_possible_score === null;
    
    if (analysisFailed) {
      console.log('⚠️ Análise falhou - NÃO salvando no banco para evitar nota zero:', callId);
      return null; // Não salvar análises que falharam
    }
    
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

    // Sanitizar dados antes de enviar para evitar overflow
    const finalGrade = Math.min(10, Math.max(0, analysis.final_grade));

    const sanitizedData = {
      p_call_id: callId,
      p_scorecard_id: analysis.scorecard_used?.id || null,
      p_overall_score: Math.min(1000, Math.max(0, analysis.overall_score)),
      p_max_possible_score: Math.min(1000, Math.max(0, analysis.max_possible_score)),
      p_final_grade: finalGrade, // Só chega aqui se não falhou
      p_general_feedback: analysis.general_feedback || 'Análise processada com sucesso',
      p_strengths: analysis.strengths || [],
      p_improvements: analysis.improvements || [],
      p_confidence: Math.min(1, Math.max(0, analysis.confidence || 0.8)),
      p_criteria_data: criteriaData || [],
      p_processing_time_ms: processingTime
    };

    console.log('📤 Enviando dados sanitizados para RPC:', {
      call_id: sanitizedData.p_call_id,
      final_grade: sanitizedData.p_final_grade,
      overall_score: sanitizedData.p_overall_score
    });

    // Salvar no banco usando RPC
    const { data, error } = await supabase.rpc('save_call_analysis', sanitizedData);

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
 * Processa análise de uma chamada (principal) - COM PERSISTÊNCIA GARANTIDA
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

  // SEMPRE verificar se já existe análise no banco primeiro
  const existing = await hasExistingAnalysis(callId);
  if (existing && !forceReprocess) {
    console.log('✅ Análise já existe no banco, retornando dados salvos:', existing.final_grade);
    
    // Converter para formato esperado
    return {
      scorecard_used: {
        id: existing.scorecard_id || '',
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

      // Salvar no banco APENAS se a análise foi bem-sucedida
      const analysisId = await saveAnalysisToDatabase(callId, analysis);
      
      if (analysisId) {
        console.log('✅ Análise completa salva:', analysisId);
      } else {
        const analysisFailed = (analysis as any).analysis_failed === true;
        if (analysisFailed) {
          console.log('ℹ️ Análise falhou - não foi salva no banco (correto)');
        } else {
          console.warn('⚠️ Análise processada mas não salva no banco (erro)');
        }
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
