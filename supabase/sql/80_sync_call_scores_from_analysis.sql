-- ===================================================================
-- SINCRONIZAR SCORES DAS ANÁLISES COM A TABELA CALLS
-- Garantir que todas as análises salvas tenham score na tabela calls
-- ===================================================================

-- 1. Atualizar tabela calls com scores das análises existentes
UPDATE calls 
SET 
    scorecard = jsonb_build_object(
        'final_score', ca.final_grade,
        'analysis_id', ca.id,
        'last_analyzed', ca.created_at,
        'scorecard_name', ca.scorecard_name,
        'confidence', ca.confidence
    ),
    ai_status = 'completed',
    updated_at = NOW()
FROM call_analysis ca
WHERE calls.id = ca.call_id
AND (
    calls.scorecard IS NULL 
    OR calls.scorecard->>'final_score' IS NULL
    OR calls.ai_status != 'completed'
);

-- 2. Função para buscar chamadas ordenadas por score
CREATE OR REPLACE FUNCTION public.get_calls_ordered_by_score(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company TEXT,
    person TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    transcription TEXT,
    ai_status TEXT,
    scorecard JSONB,
    final_score NUMERIC,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered_calls AS (
        SELECT 
            c.*,
            ca.final_grade as analysis_score,
            COALESCE(
                ca.final_grade,
                (c.scorecard->>'final_score')::NUMERIC,
                0
            ) as final_score
        FROM calls c
        LEFT JOIN call_analysis ca ON c.id = ca.call_id
        WHERE 1=1
        AND (p_sdr_email IS NULL OR c.sdr_name ILIKE '%' || p_sdr_email || '%' OR c.agent_id ILIKE '%' || p_sdr_email || '%')
        AND (p_status IS NULL OR c.status = p_status)
        AND (p_call_type IS NULL OR c.call_type = p_call_type)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    ),
    total_count AS (
        SELECT COUNT(*) as count FROM filtered_calls
    )
    SELECT 
        fc.id,
        fc.provider_call_id,
        fc.deal_id,
        COALESCE(fc.enterprise, fc.company_name, 'N/A') as company,
        COALESCE(fc.person, fc.person_name, 'N/A') as person,
        COALESCE(fc.sdr_name, fc.agent_id, 'N/A') as sdr_name,
        COALESCE(fc.sdr_email, fc.agent_id, 'N/A') as sdr_email,
        fc.status,
        fc.duration,
        fc.duration_formated,
        fc.call_type,
        fc.direction,
        fc.recording_url,
        fc.transcription,
        fc.ai_status,
        fc.scorecard,
        fc.final_score,
        fc.created_at,
        tc.count as total_count
    FROM filtered_calls fc, total_count tc
    ORDER BY fc.final_score DESC NULLS LAST, fc.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 3. Função para estatísticas de scores
CREATE OR REPLACE FUNCTION public.get_score_statistics()
RETURNS TABLE (
    total_calls_with_score BIGINT,
    avg_score NUMERIC,
    highest_score NUMERIC,
    lowest_score NUMERIC,
    calls_above_8 BIGINT,
    calls_above_6 BIGINT,
    calls_below_5 BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(*) FILTER (WHERE ca.final_grade IS NOT NULL) as total_calls_with_score,
        ROUND(AVG(ca.final_grade), 2) as avg_score,
        MAX(ca.final_grade) as highest_score,
        MIN(ca.final_grade) as lowest_score,
        COUNT(*) FILTER (WHERE ca.final_grade >= 8) as calls_above_8,
        COUNT(*) FILTER (WHERE ca.final_grade >= 6) as calls_above_6,
        COUNT(*) FILTER (WHERE ca.final_grade < 5) as calls_below_5
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_ordered_by_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_ordered_by_score TO service_role;
GRANT EXECUTE ON FUNCTION public.get_score_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_score_statistics TO service_role;

-- 5. Verificar quantas chamadas foram sincronizadas
SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE scorecard->>'final_score' IS NOT NULL) as calls_with_score,
    COUNT(*) FILTER (WHERE ai_status = 'completed') as calls_analyzed
FROM calls;

-- 6. Mostrar top 10 chamadas por score
SELECT 
    c.id,
    c.sdr_name,
    c.enterprise,
    (c.scorecard->>'final_score')::NUMERIC as score,
    c.created_at
FROM calls c
WHERE c.scorecard->>'final_score' IS NOT NULL
ORDER BY (c.scorecard->>'final_score')::NUMERIC DESC
LIMIT 10;

SELECT 'Scores sincronizados com sucesso! Filtro de maior nota deve funcionar agora.' as status;


