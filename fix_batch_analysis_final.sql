-- fix_batch_analysis_final.sql
-- Solução definitiva para ambiguidades SQL

-- 1. REMOVER FUNÇÃO PROBLEMÁTICA COMPLETAMENTE
DROP FUNCTION IF EXISTS process_batch_analysis_chunk(UUID, INTEGER);
DROP FUNCTION IF EXISTS process_batch_analysis_chunk(UUID);
DROP FUNCTION IF EXISTS process_batch_analysis_chunk;

-- 2. RECRIAR FUNÇÃO SEM AMBIGUIDADES
CREATE FUNCTION process_batch_analysis_chunk(
    p_job_id UUID,
    p_chunk_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
    v_call RECORD;
    v_analysis JSONB;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_errors INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    v_logs JSONB[] := '{}';
    v_force_reprocess BOOLEAN := false;
    v_current_processed INTEGER;
    v_current_successful INTEGER;
    v_current_failed INTEGER;
    v_current_logs JSONB;
BEGIN
    v_start_time := NOW();
    
    -- Buscar job
    SELECT * INTO v_job FROM batch_analysis_jobs WHERE id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job não encontrado');
    END IF;
    
    IF v_job.status != 'pending' AND v_job.status != 'running' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job não está processável');
    END IF;

    -- Verificar reprocessamento
    v_force_reprocess := COALESCE((v_job.filters->>'force_reprocess')::BOOLEAN, false);

    -- Marcar como running
    IF v_job.status = 'pending' THEN
        UPDATE batch_analysis_jobs 
        SET status = 'running', started_at = NOW()
        WHERE id = p_job_id;
    END IF;

    -- Valores atuais
    v_current_processed := COALESCE(v_job.processed_calls, 0);
    v_current_successful := COALESCE(v_job.successful_analyses, 0);
    v_current_failed := COALESCE(v_job.failed_analyses, 0);
    v_current_logs := COALESCE(v_job.processing_logs, '[]'::JSONB);

    -- Processar chamadas
    FOR v_call IN
        SELECT c.id
        FROM calls c
        WHERE 
            c.transcription IS NOT NULL 
            AND length(c.transcription) > 100
            AND c.duration >= 180
            AND (
                v_force_reprocess = true 
                OR NOT EXISTS (SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id)
            )
            AND (
                (v_job.filters->>'start_date' IS NULL) OR 
                (c.created_at >= (v_job.filters->>'start_date')::TIMESTAMPTZ)
            )
            AND (
                (v_job.filters->>'end_date' IS NULL) OR 
                (c.created_at <= (v_job.filters->>'end_date')::TIMESTAMPTZ)
            )
        ORDER BY c.created_at DESC
        LIMIT p_chunk_size
    LOOP
        v_processed := v_processed + 1;
        
        BEGIN
            SELECT perform_ultra_fast_ai_analysis(v_call.id) INTO v_analysis;
            
            IF (v_analysis->>'success')::BOOLEAN THEN
                v_success := v_success + 1;
                v_logs := v_logs || jsonb_build_object(
                    'call_id', v_call.id,
                    'status', 'success',
                    'score', v_analysis->>'overall_score',
                    'timestamp', NOW()
                );
            ELSE
                v_errors := v_errors + 1;
                v_logs := v_logs || jsonb_build_object(
                    'call_id', v_call.id,
                    'status', 'error',
                    'message', v_analysis->>'message',
                    'timestamp', NOW()
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_errors := v_errors + 1;
                v_logs := v_logs || jsonb_build_object(
                    'call_id', v_call.id,
                    'status', 'exception',
                    'message', SQLERRM,
                    'timestamp', NOW()
                );
        END;
    END LOOP;

    -- Atualizar job
    UPDATE batch_analysis_jobs 
    SET 
        processed_calls = v_current_processed + v_processed,
        successful_analyses = v_current_successful + v_success,
        failed_analyses = v_current_failed + v_errors,
        progress_percentage = CASE 
            WHEN v_job.total_calls > 0 
            THEN ROUND(((v_current_processed + v_processed)::NUMERIC / v_job.total_calls::NUMERIC) * 100)
            ELSE 100 
        END,
        current_call_id = v_call.id,
        processing_logs = v_current_logs || to_jsonb(v_logs)
    WHERE id = p_job_id;

    -- Verificar se completou
    IF (v_current_processed + v_processed) >= v_job.total_calls OR v_processed = 0 THEN
        UPDATE batch_analysis_jobs 
        SET status = 'completed', completed_at = NOW(), progress_percentage = 100
        WHERE id = p_job_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'processed_in_chunk', v_processed,
        'successful', v_success,
        'failed', v_errors,
        'total_processed', v_current_processed + v_processed,
        'total_calls', v_job.total_calls,
        'progress_percentage', CASE 
            WHEN v_job.total_calls > 0 
            THEN ROUND(((v_current_processed + v_processed)::NUMERIC / v_job.total_calls::NUMERIC) * 100)
            ELSE 100 
        END,
        'processing_time_ms', EXTRACT(MILLISECONDS FROM (NOW() - v_start_time)),
        'force_reprocess', v_force_reprocess
    );
END;
$$;

-- 3. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION process_batch_analysis_chunk TO authenticated;

SELECT '🚀 Função recriada sem ambiguidades - pronta para usar!' as status;
