-- CORRIGIR_ORDENACAO_SCORE.sql
-- Corrigir ordenação por score para funcionar globalmente (não página por página)

-- ===================================================================
-- ETAPA 1: ATUALIZAR FUNÇÃO get_calls_with_filters COM ORDENAÇÃO POR SCORE
-- ===================================================================

DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_sort_by text DEFAULT 'created_at',
    p_min_duration integer DEFAULT NULL,
    p_max_duration integer DEFAULT NULL,
    p_min_score numeric DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    sdr_id TEXT,
    deal_id TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    created_at TIMESTAMPTZ,
    transcription TEXT,
    insights JSONB,
    pipeline TEXT,
    cadence TEXT,
    enterprise TEXT,
    person TEXT,
    sdr TEXT,
    sdr_name TEXT,
    company TEXT,
    total_count BIGINT,
    -- Adicionar score para ordenação
    calculated_score NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered_calls AS (
        SELECT 
            c.id::TEXT as id,
            c.provider_call_id,
            c.from_number,
            c.to_number,
            c.agent_id,
            c.sdr_id::TEXT as sdr_id,
            c.deal_id,
            c.status,
            COALESCE(c.insights->>'status_voip', 'normal_clearing') as status_voip,
            COALESCE(c.insights->>'status_voip_friendly', 'Atendida') as status_voip_friendly,
            c.duration,
            COALESCE(c.duration_formated, c.insights->>'duration_formated') as duration_formated,
            c.call_type,
            c.direction,
            c.created_at,
            c.transcription,
            c.insights,
            COALESCE(c.insights->>'pipeline', 'Default') as pipeline,
            COALESCE(c.insights->>'cadence', 'Default') as cadence,
            COALESCE(c.insights->>'enterprise', c.insights->>'company') as enterprise,
            COALESCE(c.insights->>'person', c.insights->>'person_name') as person,
            COALESCE(c.insights->>'sdr', c.agent_id) as sdr,
            COALESCE(c.insights->>'sdr_name', c.agent_id) as sdr_name,
            COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') as company,
            -- Buscar score da análise (se existir)
            COALESCE(ca.final_grade, 0) as calculated_score
        FROM calls c
        LEFT JOIN call_analysis ca ON ca.call_id = c.id
        WHERE 
            -- Filtros opcionais
            (p_sdr IS NULL OR c.agent_id = p_sdr OR c.insights->>'sdr_name' = p_sdr)
            AND (p_status IS NULL OR c.status = p_status)
            AND (p_type IS NULL OR c.call_type = p_type)
            AND (p_start_date IS NULL OR c.created_at >= p_start_date)
            AND (p_end_date IS NULL OR c.created_at <= p_end_date)
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
            AND (p_min_score IS NULL OR COALESCE(ca.final_grade, 0) >= p_min_score)
    ),
    total_count AS (
        SELECT COUNT(*) as count FROM filtered_calls
    )
    SELECT 
        fc.*,
        tc.count as total_count
    FROM filtered_calls fc, total_count tc
    ORDER BY 
        -- ORDENAÇÃO CORRIGIDA: score primeiro se solicitado
        CASE 
            WHEN p_sort_by = 'score' THEN fc.calculated_score
            ELSE NULL
        END DESC NULLS LAST,
        CASE 
            WHEN p_sort_by = 'score_asc' THEN fc.calculated_score
            ELSE NULL
        END ASC NULLS LAST,
        CASE 
            WHEN p_sort_by = 'duration' THEN fc.duration
            ELSE NULL
        END DESC NULLS LAST,
        CASE 
            WHEN p_sort_by = 'company' THEN fc.company
            ELSE NULL
        END ASC NULLS LAST,
        -- Default: sempre por data decrescente
        fc.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(
    text, text, text, timestamptz, timestamptz, integer, integer, text, integer, integer, numeric
) TO authenticated, anon;

-- ===================================================================
-- ETAPA 2: TESTAR ORDENAÇÃO POR SCORE
-- ===================================================================

-- Testar ordenação por maior nota (TODAS as chamadas, não só com score > 0)
SELECT 
    id,
    company,
    sdr_name,
    calculated_score,
    duration,
    created_at
FROM get_calls_with_filters(
    p_sort_by := 'score',
    p_limit := 20  -- Aumentar para ver mais resultados
)
ORDER BY calculated_score DESC;

-- Testar ordenação por menor nota
SELECT 
    id,
    company,
    sdr_name,
    calculated_score,
    duration,
    created_at
FROM get_calls_with_filters(
    p_sort_by := 'score_asc',
    p_limit := 10
)
WHERE calculated_score > 0
ORDER BY calculated_score ASC;

-- ===================================================================
-- ETAPA 3: DIAGNÓSTICO - POR QUE SÓ 50 CHAMADAS?
-- ===================================================================

-- Verificar quantas chamadas têm análise
SELECT 
    COUNT(*) as total_calls_in_db,
    COUNT(ca.id) as calls_with_analysis,
    COUNT(CASE WHEN ca.final_grade > 0 THEN 1 END) as calls_with_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id;

-- Ver distribuição de notas
WITH score_distribution AS (
    SELECT 
        CASE 
            WHEN ca.final_grade IS NULL THEN 'Sem análise'
            WHEN ca.final_grade >= 9 THEN '9.0-10.0'
            WHEN ca.final_grade >= 8 THEN '8.0-8.9'
            WHEN ca.final_grade >= 7 THEN '7.0-7.9'
            WHEN ca.final_grade >= 6 THEN '6.0-6.9'
            WHEN ca.final_grade >= 5 THEN '5.0-5.9'
            ELSE '0.0-4.9'
        END as score_range,
        COUNT(*) as count
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    GROUP BY 
        CASE 
            WHEN ca.final_grade IS NULL THEN 'Sem análise'
            WHEN ca.final_grade >= 9 THEN '9.0-10.0'
            WHEN ca.final_grade >= 8 THEN '8.0-8.9'
            WHEN ca.final_grade >= 7 THEN '7.0-7.9'
            WHEN ca.final_grade >= 6 THEN '6.0-6.9'
            WHEN ca.final_grade >= 5 THEN '5.0-5.9'
            ELSE '0.0-4.9'
        END
)
SELECT 
    score_range,
    count
FROM score_distribution
ORDER BY 
    CASE 
        WHEN score_range = 'Sem análise' THEN 999
        ELSE 1
    END,
    score_range DESC;

-- Testar se o problema é na paginação do frontend
SELECT COUNT(*) as total_returned_by_function
FROM get_calls_with_filters(p_limit := 2000); -- Testar com limite maior

-- ===================================================================
-- ETAPA 4: VERIFICAR ANÁLISE DOS OUTROS FILTROS
-- ===================================================================

-- Verificar filtros de duração
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration >= 300 THEN 1 END) as over_5min,
    COUNT(CASE WHEN duration >= 180 THEN 1 END) as over_3min,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration
FROM calls;

-- Verificar filtros de score
SELECT 
    COUNT(*) as total_with_analysis,
    COUNT(CASE WHEN ca.final_grade >= 8 THEN 1 END) as score_8_plus,
    COUNT(CASE WHEN ca.final_grade >= 6 THEN 1 END) as score_6_plus,
    AVG(ca.final_grade) as avg_score,
    MAX(ca.final_grade) as max_score,
    MIN(ca.final_grade) as min_score
FROM call_analysis ca;

-- Verificar filtros de SDR
SELECT 
    agent_id,
    COUNT(*) as call_count,
    AVG(duration) as avg_duration,
    COUNT(CASE WHEN EXISTS(SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id) THEN 1 END) as analyzed_count
FROM calls c
GROUP BY agent_id
ORDER BY call_count DESC
LIMIT 10;

SELECT '🔧 ORDENAÇÃO POR SCORE CORRIGIDA!' as status;
SELECT '📊 Agora "Maior Nota" ordena globalmente, não página por página' as resultado;
SELECT '⚡ Teste os filtros na interface' as proximos_passos;
