-- Remover todas as versões da função get_calls_with_filters
DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

-- Criar função get_calls_with_filters com suporte a min_score
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TEXT DEFAULT NULL,
    p_end_date TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_min_score NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    audio_url TEXT,
    transcription TEXT,
    transcript_status TEXT,
    ai_status TEXT,
    insights JSONB,
    scorecard JSONB,
    score NUMERIC,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH base_calls AS (
        SELECT 
            c.*,
            -- Calcular score de múltiplas fontes
            COALESCE(
                -- Primeiro: call_analysis (escala 0-10)
                ca.final_grade,
                -- Segundo: scorecard (escala 0-10)
                CASE 
                    WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                        COALESCE(
                            (c.scorecard->>'overall_score')::NUMERIC,
                            (c.scorecard->>'final_score')::NUMERIC,
                            (c.scorecard->>'total_score')::NUMERIC,
                            (c.scorecard->>'score')::NUMERIC
                        )
                    ELSE NULL
                END
            ) AS calculated_score,
            COUNT(*) OVER() as total_count
        FROM calls c
        LEFT JOIN call_analysis ca ON c.id = ca.call_id
        WHERE 
            -- Filtros básicos
            (p_sdr IS NULL OR p_sdr = '' OR 
             (c.agent_id IS NOT NULL AND LOWER(c.agent_id) LIKE '%' || LOWER(p_sdr) || '%'))
            AND (p_status IS NULL OR p_status = '' OR c.status_voip = p_status)
            AND (p_type IS NULL OR p_type = '' OR c.call_type = p_type)
            AND (p_start_date IS NULL OR c.created_at >= p_start_date::TIMESTAMP WITH TIME ZONE)
            AND (p_end_date IS NULL OR c.created_at <= p_end_date::TIMESTAMP WITH TIME ZONE)
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
    ),
    filtered_calls AS (
        SELECT *
        FROM base_calls bc
        WHERE 
            -- FILTRO DE SCORE MÍNIMO
            (p_min_score IS NULL OR 
             (bc.calculated_score IS NOT NULL AND bc.calculated_score >= p_min_score))
    )
    SELECT 
        fc.id,
        fc.provider_call_id,
        fc.deal_id,
        
        -- EMPRESA (simplificado)
        COALESCE(fc.enterprise, fc.insights->>'companyName', 'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))) AS company_name,
        
        -- PESSOA (simplificado)
        COALESCE(fc.person, fc.insights->>'personName', 'Contato ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))) AS person_name,
        
        -- Email da pessoa
        COALESCE(fc.insights->>'personEmail', fc.insights->>'email') AS person_email,
        
        -- SDR campos
        fc.agent_id AS sdr_id,
        COALESCE(fc.agent_id, 'Sistema') AS sdr_name,
        fc.agent_id AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(fc.agent_id, 'sistema') AS sdr_avatar_url,
        
        -- Outros campos
        fc.status,
        fc.status_voip,
        CASE 
            WHEN fc.status_voip = 'normal_clearing' THEN 'Atendida'
            WHEN fc.status_voip = 'no_answer' THEN 'Não atendida'
            WHEN fc.status_voip = 'originator_cancel' THEN 'Cancelada pela SDR'
            ELSE fc.status_voip
        END AS status_voip_friendly,
        fc.duration,
        fc.call_type,
        COALESCE(fc.direction, 'outbound') AS direction,
        fc.recording_url,
        fc.audio_bucket,
        fc.audio_path,
        fc.recording_url AS audio_url,
        fc.transcription,
        COALESCE(fc.transcript_status, 'pending') AS transcript_status,
        COALESCE(fc.ai_status, 'pending') AS ai_status,
        fc.insights,
        fc.scorecard,
        fc.calculated_score AS score,
        fc.from_number,
        fc.to_number,
        fc.agent_id,
        fc.created_at,
        fc.updated_at,
        fc.processed_at,
        fc.total_count
        
    FROM filtered_calls fc
    ORDER BY 
        CASE WHEN p_sort_by = 'score' THEN fc.calculated_score END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'duration' THEN fc.duration END DESC,
        fc.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

-- Teste rápido
SELECT 'Função get_calls_with_filters criada com sucesso!' as status;


