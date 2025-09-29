-- 🔧 CORRIGIR: Função get_calls_with_filters completa
-- Execute este script no SQL Editor do Supabase

-- 1. Remover função atual
DROP FUNCTION IF EXISTS get_calls_with_filters CASCADE;

-- 2. Criar função corrigida com todos os campos
CREATE OR REPLACE FUNCTION get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_min_score NUMERIC DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    status TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    status_voip TEXT,
    status_voip_friendly TEXT,
    pipeline TEXT,
    cadence TEXT,
    deal_stage TEXT,
    enterprise TEXT,
    person TEXT,
    sdr_email TEXT,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        c.status,
        c.duration,
        c.duration_formated,
        c.call_type,
        c.direction,
        c.recording_url,
        c.transcription,
        c.insights,
        c.scorecard,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.status_voip,
        c.status_voip_friendly,
        -- Pipeline extraído de insights ou call_type
        CASE 
            WHEN c.call_type IN ('Apresentação de Proposta', 'Qualificação', 'Descoberta de Necessidades', 'Agendamento', 'Follow-up') 
            THEN c.call_type
            ELSE COALESCE(
                (c.insights->>'pipeline')::TEXT,
                (c.insights->>'deal_stage')::TEXT,
                (c.insights->>'stage')::TEXT,
                'N/A'
            )
        END as pipeline,
        -- Cadência extraída de insights
        COALESCE(
            (c.insights->>'cadence')::TEXT,
            (c.insights->>'sequence')::TEXT,
            'N/A'
        ) as cadence,
        -- Estágio do deal extraído de insights
        COALESCE(
            (c.insights->>'deal_stage')::TEXT,
            (c.insights->>'stage')::TEXT,
            'N/A'
        ) as deal_stage,
        -- CORREÇÃO: Enterprise extraído de insights
        COALESCE(
            (c.insights->>'enterprise')::TEXT,
            (c.insights->>'company')::TEXT,
            (c.insights->>'organization')::TEXT,
            (c.insights->>'org_name')::TEXT,
            'N/A'
        ) as enterprise,
        -- CORREÇÃO: Person extraído de insights
        COALESCE(
            (c.insights->>'person')::TEXT,
            (c.insights->>'contact')::TEXT,
            (c.insights->>'client')::TEXT,
            (c.insights->>'person_name')::TEXT,
            'N/A'
        ) as person,
        -- CORREÇÃO: SDR email extraído de insights
        COALESCE(
            (c.insights->>'sdr_email')::TEXT,
            (c.insights->>'agent_email')::TEXT,
            (c.insights->>'email')::TEXT,
            'N/A'
        ) as sdr_email,
        -- Contador total
        COUNT(*) OVER() as total_count
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        (p_sdr IS NULL OR c.agent_id = p_sdr)
        AND (p_status IS NULL OR c.status = p_status)
        AND (p_type IS NULL OR c.call_type = p_type)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
        AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
        AND (p_min_score IS NULL OR ca.final_grade >= p_min_score)
        AND (p_search_query IS NULL OR 
             c.deal_id ILIKE '%' || p_search_query || '%' OR
             (c.insights->>'enterprise')::TEXT ILIKE '%' || p_search_query || '%' OR
             (c.insights->>'company')::TEXT ILIKE '%' || p_search_query || '%' OR
             (c.insights->>'organization')::TEXT ILIKE '%' || p_search_query || '%'
        )
    ORDER BY 
        CASE WHEN p_sort_by = 'created_at' THEN c.created_at END DESC,
        CASE WHEN p_sort_by = 'duration' THEN c.duration END DESC,
        CASE WHEN p_sort_by = 'score' THEN ca.final_grade END DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO service_role;

-- 4. Testar função corrigida
SELECT 'Função corrigida criada!' as status;

-- 5. Teste com dados reais
SELECT 
    id,
    enterprise,
    person,
    status_voip_friendly,
    call_type
FROM get_calls_with_filters(
    null, null, null, null, null, 5, 0, 'created_at', null, null, null, null
);
