-- create_batch_analysis_system.sql
-- Sistema completo de análise IA em lote

-- ===================================================================
-- ETAPA 1: TABELA DE JOBS DE ANÁLISE EM LOTE
-- ===================================================================

CREATE TABLE IF NOT EXISTS batch_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    
    -- Filtros de seleção
    filters JSONB NOT NULL DEFAULT '{}',
    
    -- Status do job
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Estatísticas
    total_calls INTEGER DEFAULT 0,
    processed_calls INTEGER DEFAULT 0,
    successful_analyses INTEGER DEFAULT 0,
    failed_analyses INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Resultados agregados
    results_summary JSONB DEFAULT '{}',
    
    -- Controle de progresso
    progress_percentage INTEGER DEFAULT 0,
    current_call_id UUID,
    estimated_completion TIMESTAMPTZ,
    
    -- Logs e erros
    error_message TEXT,
    processing_logs JSONB DEFAULT '[]'
);

-- ===================================================================
-- ETAPA 2: FUNÇÃO PARA CRIAR JOB DE ANÁLISE EM LOTE
-- ===================================================================

CREATE OR REPLACE FUNCTION create_batch_analysis_job(
    job_name VARCHAR,
    filters_json JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_job_id UUID;
    call_count INTEGER;
BEGIN
    -- Contar quantas chamadas serão analisadas
    SELECT COUNT(*) INTO call_count
    FROM calls c
    WHERE 
        -- Filtros básicos obrigatórios
        c.transcription IS NOT NULL 
        AND length(c.transcription) > 100
        AND c.duration >= 180
        AND c.ai_status != 'completed'
        -- Filtros opcionais do usuário
        AND (
            (filters_json->>'start_date' IS NULL) OR 
            (c.created_at >= (filters_json->>'start_date')::TIMESTAMPTZ)
        )
        AND (
            (filters_json->>'end_date' IS NULL) OR 
            (c.created_at <= (filters_json->>'end_date')::TIMESTAMPTZ)
        )
        AND (
            (filters_json->>'call_types' IS NULL) OR 
            (c.call_type = ANY(string_to_array(filters_json->>'call_types', ',')))
        )
        AND (
            (filters_json->>'sdrs' IS NULL) OR 
            (c.agent_id = ANY(string_to_array(filters_json->>'sdrs', ',')))
        );

    -- Criar o job
    INSERT INTO batch_analysis_jobs (
        id,
        user_id,
        name,
        filters,
        status,
        total_calls,
        created_at
    ) VALUES (
        gen_random_uuid(),
        auth.uid(),
        job_name,
        filters_json,
        'pending',
        call_count,
        NOW()
    ) RETURNING id INTO new_job_id;

    RETURN new_job_id;
END;
$$;

-- ===================================================================
-- ETAPA 3: FUNÇÃO PARA PROCESSAR LOTE (OTIMIZADA)
-- ===================================================================

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
    processing_logs JSONB[] := '{}';
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

    -- Marcar job como running se ainda não estiver
    IF job_record.status = 'pending' THEN
        UPDATE batch_analysis_jobs 
        SET status = 'running', started_at = NOW()
        WHERE id = job_id_param;
    END IF;

    -- 🚀 PROCESSAR CHUNK DE CHAMADAS
    FOR call_record IN
        SELECT c.id
        FROM calls c
        WHERE 
            -- Filtros básicos
            c.transcription IS NOT NULL 
            AND length(c.transcription) > 100
            AND c.duration >= 180
            AND NOT EXISTS (SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id)
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
                processing_logs := processing_logs || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'success',
                    'score', analysis_result->>'overall_score',
                    'timestamp', NOW()
                );
            ELSE
                error_count := error_count + 1;
                processing_logs := processing_logs || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'error',
                    'message', analysis_result->>'message',
                    'timestamp', NOW()
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                processing_logs := processing_logs || jsonb_build_object(
                    'call_id', call_record.id,
                    'status', 'exception',
                    'message', SQLERRM,
                    'timestamp', NOW()
                );
        END;
    END LOOP;

    -- Atualizar estatísticas do job
    UPDATE batch_analysis_jobs 
    SET 
        processed_calls = COALESCE(processed_calls, 0) + processed_count,
        successful_analyses = COALESCE(successful_analyses, 0) + success_count,
        failed_analyses = COALESCE(failed_analyses, 0) + error_count,
        progress_percentage = CASE 
            WHEN total_calls > 0 
            THEN ROUND(((COALESCE(processed_calls, 0) + processed_count)::NUMERIC / total_calls::NUMERIC) * 100)
            ELSE 100 
        END,
        current_call_id = call_record.id,
        processing_logs = COALESCE(processing_logs, '[]'::JSONB) || to_jsonb(processing_logs),
        estimated_completion = CASE
            WHEN processed_count > 0 
            THEN NOW() + (
                (EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, NOW()))) / processed_count) * 
                (total_calls - COALESCE(processed_calls, 0) - processed_count)
            ) * INTERVAL '1 second'
            ELSE NULL
        END
    WHERE id = job_id_param;

    -- Verificar se completou
    IF (job_record.processed_calls + processed_count) >= job_record.total_calls THEN
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
        'total_processed', job_record.processed_calls + processed_count,
        'total_calls', job_record.total_calls,
        'progress_percentage', ROUND(((job_record.processed_calls + processed_count)::NUMERIC / job_record.total_calls::NUMERIC) * 100),
        'processing_time_ms', EXTRACT(MILLISECONDS FROM (NOW() - start_time)),
        'estimated_completion', CASE
            WHEN processed_count > 0 
            THEN NOW() + (
                (EXTRACT(EPOCH FROM (NOW() - start_time)) / processed_count) * 
                (job_record.total_calls - job_record.processed_calls - processed_count)
            ) * INTERVAL '1 second'
            ELSE NULL
        END
    );
END;
$$;

-- ===================================================================
-- ETAPA 4: FUNÇÃO PARA OBTER STATUS DO JOB
-- ===================================================================

CREATE OR REPLACE FUNCTION get_batch_analysis_status(job_id_param UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'status', status,
        'total_calls', total_calls,
        'processed_calls', processed_calls,
        'successful_analyses', successful_analyses,
        'failed_analyses', failed_analyses,
        'progress_percentage', progress_percentage,
        'created_at', created_at,
        'started_at', started_at,
        'completed_at', completed_at,
        'estimated_completion', estimated_completion,
        'processing_time_seconds', CASE
            WHEN started_at IS NOT NULL THEN
                EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at))
            ELSE NULL
        END,
        'filters', filters,
        'error_message', error_message
    )
    FROM batch_analysis_jobs
    WHERE id = job_id_param;
$$;

-- ===================================================================
-- ETAPA 5: FUNÇÃO PARA LISTAR JOBS DO USUÁRIO
-- ===================================================================

CREATE OR REPLACE FUNCTION get_user_batch_analysis_jobs()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    status VARCHAR,
    total_calls INTEGER,
    processed_calls INTEGER,
    progress_percentage INTEGER,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_seconds NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        j.id,
        j.name,
        j.status,
        j.total_calls,
        j.processed_calls,
        j.progress_percentage,
        j.created_at,
        j.completed_at,
        CASE
            WHEN j.started_at IS NOT NULL THEN
                EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - j.started_at))
            ELSE NULL
        END as processing_time_seconds
    FROM batch_analysis_jobs j
    WHERE j.user_id = auth.uid()
    ORDER BY j.created_at DESC;
$$;

-- ===================================================================
-- ETAPA 6: FUNÇÃO PARA OBTER RESULTADOS AGREGADOS
-- ===================================================================

CREATE OR REPLACE FUNCTION get_batch_analysis_results(job_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
    results JSONB;
BEGIN
    -- Verificar se o job existe e pertence ao usuário
    SELECT * INTO job_record 
    FROM batch_analysis_jobs 
    WHERE id = job_id_param AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job não encontrado');
    END IF;
    
    -- Calcular estatísticas agregadas
    WITH analysis_stats AS (
        SELECT 
            COUNT(*) as total_analyzed,
            AVG(final_grade) as avg_score,
            MIN(final_grade) as min_score,
            MAX(final_grade) as max_score,
            COUNT(CASE WHEN final_grade >= 8 THEN 1 END) as excellent_count,
            COUNT(CASE WHEN final_grade >= 6 AND final_grade < 8 THEN 1 END) as good_count,
            COUNT(CASE WHEN final_grade >= 4 AND final_grade < 6 THEN 1 END) as regular_count,
            COUNT(CASE WHEN final_grade < 4 THEN 1 END) as poor_count
        FROM call_analysis ca
        JOIN calls c ON ca.call_id = c.id
        WHERE ca.created_at >= job_record.started_at
        AND (
            (job_record.filters->>'start_date' IS NULL) OR 
            (c.created_at >= (job_record.filters->>'start_date')::TIMESTAMPTZ)
        )
        AND (
            (job_record.filters->>'end_date' IS NULL) OR 
            (c.created_at <= (job_record.filters->>'end_date')::TIMESTAMPTZ)
        )
    ),
    sdr_performance AS (
        SELECT 
            c.agent_id,
            COUNT(*) as calls_analyzed,
            AVG(ca.final_grade) as avg_score,
            MAX(ca.final_grade) as best_score
        FROM call_analysis ca
        JOIN calls c ON ca.call_id = c.id
        WHERE ca.created_at >= job_record.started_at
        GROUP BY c.agent_id
        ORDER BY avg_score DESC
        LIMIT 10
    ),
    scorecard_usage AS (
        SELECT 
            s.name as scorecard_name,
            COUNT(*) as usage_count,
            AVG(ca.final_grade) as avg_score
        FROM call_analysis ca
        JOIN scorecards s ON ca.scorecard_id = s.id
        WHERE ca.created_at >= job_record.started_at
        GROUP BY s.id, s.name
        ORDER BY usage_count DESC
    )
    SELECT jsonb_build_object(
        'job_info', jsonb_build_object(
            'id', job_record.id,
            'name', job_record.name,
            'status', job_record.status,
            'total_calls', job_record.total_calls,
            'processed_calls', job_record.processed_calls,
            'success_rate', CASE 
                WHEN job_record.processed_calls > 0 
                THEN ROUND((job_record.successful_analyses::NUMERIC / job_record.processed_calls::NUMERIC) * 100, 1)
                ELSE 0 
            END
        ),
        'overall_stats', jsonb_build_object(
            'total_analyzed', COALESCE(ast.total_analyzed, 0),
            'average_score', ROUND(COALESCE(ast.avg_score, 0), 1),
            'min_score', COALESCE(ast.min_score, 0),
            'max_score', COALESCE(ast.max_score, 0),
            'score_distribution', jsonb_build_object(
                'excellent_8_10', COALESCE(ast.excellent_count, 0),
                'good_6_7', COALESCE(ast.good_count, 0),
                'regular_4_5', COALESCE(ast.regular_count, 0),
                'poor_0_3', COALESCE(ast.poor_count, 0)
            )
        ),
        'top_performers', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'sdr_id', sp.agent_id,
                    'calls_analyzed', sp.calls_analyzed,
                    'average_score', ROUND(sp.avg_score, 1),
                    'best_score', sp.best_score
                )
            )
            FROM sdr_performance sp
        ),
        'scorecard_usage', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'scorecard_name', su.scorecard_name,
                    'usage_count', su.usage_count,
                    'average_score', ROUND(su.avg_score, 1)
                )
            )
            FROM scorecard_usage su
        )
    ) INTO results
    FROM analysis_stats ast;

    RETURN jsonb_build_object(
        'success', true,
        'results', results
    );
END;
$$;

-- ===================================================================
-- ETAPA 7: PERMISSÕES E ÍNDICES
-- ===================================================================

-- RLS para batch_analysis_jobs
ALTER TABLE batch_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own batch jobs" ON batch_analysis_jobs
    FOR ALL USING (user_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_status 
ON batch_analysis_jobs (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_progress 
ON batch_analysis_jobs (status, progress_percentage) 
WHERE status IN ('pending', 'running');

-- Permissões
GRANT EXECUTE ON FUNCTION create_batch_analysis_job TO authenticated;
GRANT EXECUTE ON FUNCTION process_batch_analysis_chunk TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_analysis_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_batch_analysis_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_analysis_results TO authenticated;

SELECT '🚀 Sistema de análise em lote criado com sucesso!' as status;
SELECT '📊 Funcionalidades: Jobs, Progress Tracking, Resultados Agregados' as features;
SELECT '⚡ Otimizado para processar milhares de chamadas rapidamente' as performance;
