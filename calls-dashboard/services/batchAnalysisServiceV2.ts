import { supabase } from '../supabaseClient';

export interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_calls: number;
  processed_calls: number;
  successful_analyses: number;
  failed_analyses: number;
  progress_percentage: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  processing_time_seconds?: number;
  filters: any;
  error_message?: string;
}

export interface BatchFilters {
  startDate?: string;
  endDate?: string;
  callTypes?: string[];
  sdrs?: string[];
  forceReprocess?: boolean;
}

/**
 * Criar um novo job de análise em lote
 */
export async function createBatchAnalysisJob(
  name: string,
  filters: BatchFilters = {}
): Promise<string> {
  try {
    console.log('🚀 Criando job de análise em lote:', { name, filters });

    const filtersJson = {
      start_date: filters.startDate ? new Date(filters.startDate).toISOString() : null,
      end_date: filters.endDate ? new Date(filters.endDate).toISOString() : null,
      call_types: filters.callTypes?.join(',') || null,
      sdrs: filters.sdrs?.join(',') || null,
      force_reprocess: filters.forceReprocess || false
    };

    const { data: jobId, error } = await supabase.rpc('create_batch_analysis_job', {
      job_name: name,
      filters_json: filtersJson
    });

    if (error) throw error;

    console.log('✅ Job criado com ID:', jobId);
    return jobId;
  } catch (error) {
    console.error('❌ Erro ao criar job:', error);
    throw error;
  }
}

/**
 * Processar um chunk do job de análise
 */
export async function processBatchAnalysisChunk(
  jobId: string,
  chunkSize: number = 5
): Promise<any> {
  try {
    const { data: result, error } = await supabase.rpc('process_batch_analysis_chunk', {
      job_id_param: jobId,
      chunk_size: chunkSize
    });

    if (error) throw error;

    return result;
  } catch (error) {
    console.error('❌ Erro ao processar chunk:', error);
    throw error;
  }
}

/**
 * Obter status de um job
 */
export async function getBatchAnalysisStatus(jobId: string): Promise<any> {
  try {
    const { data: status, error } = await supabase.rpc('get_batch_analysis_status', {
      job_id_param: jobId
    });

    if (error) throw error;

    return status;
  } catch (error) {
    console.error('❌ Erro ao obter status:', error);
    throw error;
  }
}

/**
 * Listar jobs do usuário
 */
export async function getUserBatchAnalysisJobs(): Promise<BatchJob[]> {
  try {
    const { data: jobs, error } = await supabase.rpc('get_user_batch_analysis_jobs');

    if (error) throw error;

    return jobs || [];
  } catch (error) {
    console.error('❌ Erro ao listar jobs:', error);
    throw error;
  }
}

/**
 * Obter resultados agregados de um job
 */
export async function getBatchAnalysisResults(jobId: string): Promise<any> {
  try {
    const { data: results, error } = await supabase.rpc('get_batch_analysis_results', {
      job_id_param: jobId
    });

    if (error) throw error;

    return results;
  } catch (error) {
    console.error('❌ Erro ao obter resultados:', error);
    throw error;
  }
}

/**
 * Processar job completo com polling
 */
export async function processFullBatchJob(
  jobId: string,
  onProgress?: (progress: any) => void
): Promise<void> {
  try {
    console.log('🔄 Iniciando processamento completo do job:', jobId);
    
    let processing = true;
    let attempts = 0;
    const maxAttempts = 1000; // Máximo de tentativas para evitar loop infinito
    
    while (processing && attempts < maxAttempts) {
      attempts++;
      
      // Processar chunk
      const result = await processBatchAnalysisChunk(jobId, 5);
      
      console.log(`📊 Chunk ${attempts} processado:`, result);
      
      // Callback de progresso
      if (onProgress) {
        onProgress(result);
      }
      
      // Verificar se completou
      if (result?.progress_percentage >= 100) {
        processing = false;
        console.log('✅ Job completado!');
      } else if (result?.processed_in_chunk === 0) {
        // Se não processou nenhuma chamada, pode ter terminado
        console.log('⚠️ Nenhuma chamada processada neste chunk, verificando status...');
        const status = await getBatchAnalysisStatus(jobId);
        if (status?.status === 'completed') {
          processing = false;
        }
      }
      
      // Aguardar antes do próximo chunk
      if (processing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ Job atingiu limite máximo de tentativas');
    }
    
  } catch (error) {
    console.error('💥 Erro no processamento completo:', error);
    throw error;
  }
}

/**
 * Análise rápida - criar e processar job imediatamente
 */
export async function quickBatchAnalysis(
  forceReprocess: boolean = false,
  onProgress?: (progress: any) => void
): Promise<any> {
  try {
    const jobName = `Análise ${forceReprocess ? 'Completa' : 'Rápida'} - ${new Date().toLocaleTimeString()}`;
    
    // Criar job
    const jobId = await createBatchAnalysisJob(jobName, {
      forceReprocess,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
      endDate: new Date().toISOString().split('T')[0]
    });
    
    // Processar
    await processFullBatchJob(jobId, onProgress);
    
    // Retornar resultados
    return await getBatchAnalysisResults(jobId);
    
  } catch (error) {
    console.error('❌ Erro na análise rápida:', error);
    throw error;
  }
}
