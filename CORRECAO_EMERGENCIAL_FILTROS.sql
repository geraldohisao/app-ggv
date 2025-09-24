-- CORRECAO_EMERGENCIAL_FILTROS.sql
-- Correção emergencial para múltiplos problemas nos filtros

-- ===================================================================
-- PROBLEMA 1: ERR_INSUFFICIENT_RESOURCES - RPC get_call_analysis muito pesada
-- SOLUÇÃO: Simplificar a RPC
-- ===================================================================

DROP FUNCTION IF EXISTS public.get_call_analysis(UUID);

CREATE OR REPLACE FUNCTION public.get_call_analysis(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    scorecard_id UUID,
    scorecard_name TEXT,
    final_grade NUMERIC,
    overall_score INTEGER,
    detailed_analysis JSONB,
    analysis_created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ca.id,
        ca.call_id,
        ca.scorecard_id,
        ca.scorecard_name,
        ca.final_grade,
        ca.overall_score,
        ca.detailed_analysis,
        ca.created_at as analysis_created_at
    FROM call_analysis ca
    WHERE ca.call_id = p_call_id
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_analysis(UUID) TO authenticated, service_role;

-- ===================================================================
-- PROBLEMA 2: Paginação mostrando "50 de 50" ao invés do total real
-- SOLUÇÃO: Corrigir a função get_calls_with_filters para retornar total correto
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
    calculated_score NUMERIC,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH base_calls AS (
        SELECT 
            c.id,
            c.provider_call_id,
            c.from_number,
            c.to_number,
            c.agent_id,
            c.sdr_id,
            c.deal_id,
            c.status,
            c.duration,
            c.duration_formated,
            c.call_type,
            c.direction,
            c.created_at,
            c.transcription,
            c.insights,
            -- Extrair dados dos insights com prioridade correta
            COALESCE(c.insights->>'enterprise', c.insights->>'company') as enterprise,
            COALESCE(c.insights->>'person', c.insights->>'person_name') as person,
            COALESCE(c.insights->>'sdr_name', c.agent_id) as sdr_name,
            COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') as company,
            COALESCE(c.insights->>'status_voip', 'normal_clearing') as status_voip,
            COALESCE(c.insights->>'status_voip_friendly', 'Atendida') as status_voip_friendly,
            COALESCE(c.insights->>'pipeline', 'Default') as pipeline,
            COALESCE(c.insights->>'cadence', 'Default') as cadence,
            COALESCE(c.insights->>'sdr', c.agent_id) as sdr,
            -- Buscar score da análise
            COALESCE(ca.final_grade, 0) as calculated_score
        FROM calls c
        LEFT JOIN call_analysis ca ON ca.call_id = c.id
        WHERE 
            (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%' OR c.insights->>'sdr_name' ILIKE '%' || p_sdr || '%')
            AND (p_status IS NULL OR c.status = p_status)
            AND (p_type IS NULL OR c.call_type = p_type)
            AND (p_start_date IS NULL OR c.created_at >= p_start_date)
            AND (p_end_date IS NULL OR c.created_at <= p_end_date)
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
            AND (p_min_score IS NULL OR COALESCE(ca.final_grade, 0) >= p_min_score)
    ),
    total_count AS (
        SELECT COUNT(*) as count FROM base_calls
    ),
    sorted_calls AS (
        SELECT 
            bc.*,
            tc.count as total_count
        FROM base_calls bc, total_count tc
        ORDER BY 
            CASE 
                WHEN p_sort_by = 'score' THEN bc.calculated_score
            END DESC NULLS LAST,
            CASE 
                WHEN p_sort_by = 'score_asc' THEN bc.calculated_score
            END ASC NULLS LAST,
            CASE 
                WHEN p_sort_by = 'duration' THEN bc.duration
            END DESC NULLS LAST,
            CASE 
                WHEN p_sort_by = 'company' THEN bc.company
            END ASC NULLS LAST,
            bc.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        sc.id::TEXT,
        sc.provider_call_id,
        sc.from_number,
        sc.to_number,
        sc.agent_id,
        sc.sdr_id::TEXT,
        sc.deal_id,
        sc.status,
        sc.status_voip,
        sc.status_voip_friendly,
        sc.duration,
        sc.duration_formated,
        sc.call_type,
        sc.direction,
        sc.created_at,
        sc.transcription,
        sc.insights,
        sc.pipeline,
        sc.cadence,
        sc.enterprise,
        sc.person,
        sc.sdr,
        sc.sdr_name,
        sc.company,
        sc.calculated_score,
        sc.total_count
    FROM sorted_calls sc;
$$;

GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(
    text, text, text, timestamptz, timestamptz, integer, integer, text, integer, integer, numeric
) TO authenticated, anon;

-- ===================================================================
-- PROBLEMA 3: Verificar se dados de empresa estão sendo retornados
-- ===================================================================

-- Testar se a função retorna dados de empresa corretamente
SELECT 
    id,
    enterprise,
    person,
    company,
    sdr_name,
    agent_id,
    calculated_score,
    total_count
FROM get_calls_with_filters(
    p_sort_by := 'score',
    p_limit := 10
)
ORDER BY calculated_score DESC;

-- ===================================================================
-- PROBLEMA 4: Verificar total de chamadas
-- ===================================================================

-- Contar total real de chamadas
SELECT COUNT(*) as total_real_calls FROM calls;

-- Testar total retornado pela função
SELECT DISTINCT total_count FROM get_calls_with_filters(p_limit := 1);

SELECT '🚨 CORREÇÃO EMERGENCIAL APLICADA!' as status;
SELECT '📊 Testando: paginação, nomes de empresa, scores, RPCs' as areas_corrigidas;


