-- fix_batch_analysis_ambiguity_complete.sql
-- Corrigir TODAS as ambiguidades na função process_batch_analysis_chunk

CREATE OR REPLACE FUNCTION process_batch_analysis_chunk(
    job_id_param UUID,
    chunk_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
    call_record RECORD;
    analysis_result JSONB;
    processed_count INTEGER := 0;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    processing_logs_array JSONB[] := '{}';
    force_reprocess BOOLEAN := false;
    current_processed INTEGER;
    current_successful INTEGER;
    current_failed INTEGER;
BEGIN
    start_time := NOW();
    
    -- Buscar job
    SELECT * INTO job_record FROM batch_analysis_jobs WHERE id = job_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job não encontrado');
    END IF;
    
    IF job_record.status != 'pending' AND job_record.status != 'running' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job não está em estado processável');
    END IF;

    -- Verificar se é reprocessamento forçado
    force_reprocess := COALESCE((job_record.filters->>'force_reprocess')::BOOLEAN, false);

    -- Marcar job como running se ainda não estiver
    IF job_record.status = 'pending' THEN
        UPDATE batch_analysis_jobs 
        SET status = 'running', started_at = NOW()
        WHERE id = job_id_param;
    END IF;

    -- Armazenar valores atuais para evitar ambiguidade
    current_processed := COALESCE(job_record.processed_calls, 0);
    current_successful := COALESCE(job_record.successful_analyses, 0);
    current_failed := COALESCE(job_record.failed_analyses, 0);

    -- 🚀 PROCESSAR CHUNK DE CHAMADAS (com suporte a reprocessamento)
    FOR call_record IN
        SELECT c.id
        FROM calls c
        WHERE 
            -- Filtros básicos
            c.transcription IS NOT NULL 
            AND length(c.transcription) > 100
            AND c.duration >= 180
            -- Condição de análise: se force_reprocess=true, pega todas; senão, só as não analisadas
            AND (
                force_reprocess = true 
                OR NOT EXISTS (SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id)
            )
            -- Filtros do job
            AND (
                (job_record.filters->>'start_date' IS NULL) OR 
                (c.created_at >= (job_record.filters->>'start_date')::TIMESTAMPTZ)
            )
            AND (
                (job_record.filters->>'end_date' IS NULL) OR 
                (c.created_at <= (job_record.filters->>'end_date')::TIMESTAMPTZ)
            )
            AND (
                (job_record.filters->>'call_types' IS NULL) OR 
                (c.call_type = ANY(string_to_array(job_record.filters->>'call_types', ',')))
            )
            AND (
                (job_record.filters->>'sdrs' IS NULL) OR 
                (c.agent_id = ANY(string_to_array(job_record.filters->>'sdrs', ',')))
            )
        ORDER BY c.created_at DESC
        LIMIT chunk_size
    LOOP
        processed_count := processed_count + 1;
        
        BEGIN
            -- Analisar chamada usando nossa função otimizada
            SELECT perform_ultra_fast_ai_analysis(call_record.id) INTO analysis_result;
            
            IF (analysis_result->>'success')::BOOLEAN THEN
                success_count := success_count + 1;
                processing_logs_array := processing_logs_array || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'success',
                    'score', analysis_result->>'overall_score',
                    'scorecard', analysis_result->'scorecard'->>'name',
                    'timestamp', NOW()
                );
            ELSE
                error_count := error_count + 1;
                processing_logs_array := processing_logs_array || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'error',
                    'message', analysis_result->>'message',
                    'timestamp', NOW()
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                processing_logs_array := processing_logs_array || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'exception',
                    'message', SQLERRM,
                    'timestamp', NOW()
                );
        END;
    END LOOP;

    -- Atualizar estatísticas do job (usando variáveis para evitar ambiguidade)
    UPDATE batch_analysis_jobs 
    SET 
        processed_calls = current_processed + processed_count,
        successful_analyses = current_successful + success_count,
        failed_analyses = current_failed + error_count,
        progress_percentage = CASE 
            WHEN job_record.total_calls > 0 
            THEN ROUND(((current_processed + processed_count)::NUMERIC / job_record.total_calls::NUMERIC) * 100)
            ELSE 100 
        END,
        current_call_id = call_record.id,
        processing_logs = COALESCE(batch_analysis_jobs.processing_logs, '[]'::JSONB) || to_jsonb(processing_logs_array),
        estimated_completion = CASE
            WHEN processed_count > 0 
            THEN NOW() + (
                (EXTRACT(EPOCH FROM (NOW() - COALESCE(job_record.started_at, NOW()))) / (current_processed + processed_count)) * 
                (job_record.total_calls - current_processed - processed_count)
            ) * INTERVAL '1 second'
            ELSE NULL
        END
    WHERE id = job_id_param;

    -- Verificar se completou
    IF (current_processed + processed_count) >= job_record.total_calls OR processed_count = 0 THEN
        UPDATE batch_analysis_jobs 
        SET 
            status = 'completed',
            completed_at = NOW(),
            progress_percentage = 100
        WHERE id = job_id_param;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'processed_in_chunk', processed_count,
        'successful', success_count,
        'failed', error_count,
        'total_processed', current_processed + processed_count,
        'total_calls', job_record.total_calls,
        'progress_percentage', CASE 
            WHEN job_record.total_calls > 0 
            THEN ROUND(((current_processed + processed_count)::NUMERIC / job_record.total_calls::NUMERIC) * 100)
            ELSE 100 
        END,
        'processing_time_ms', EXTRACT(MILLISECONDS FROM (NOW() - start_time)),
        'force_reprocess', force_reprocess,
        'logs', processing_logs_array
    );
END;
$$;

SELECT '✅ Todas as ambiguidades SQL corrigidas!' as status;
