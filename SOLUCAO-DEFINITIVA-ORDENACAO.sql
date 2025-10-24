-- =====================================================
-- SOLUÇÃO DEFINITIVA: ORDENAÇÃO GLOBAL
-- =====================================================
-- Versão limpa, testada e funcional

DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

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
    p_min_score NUMERIC DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, provider_call_id TEXT, deal_id TEXT,
    company_name TEXT, person_name TEXT, person_email TEXT,
    sdr_id TEXT, sdr_name TEXT, sdr_email TEXT, sdr_avatar_url TEXT,
    status TEXT, status_voip TEXT, status_voip_friendly TEXT,
    duration INTEGER, duration_seconds INTEGER, duration_formated TEXT,
    call_type TEXT, direction TEXT,
    recording_url TEXT, audio_bucket TEXT, audio_path TEXT, audio_url TEXT,
    transcription TEXT, transcript_status TEXT, ai_status TEXT,
    insights JSONB, scorecard JSONB, score NUMERIC,
    from_number TEXT, to_number TEXT, agent_id TEXT,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, processed_at TIMESTAMPTZ,
    total_count BIGINT, enterprise TEXT, person TEXT, pipeline TEXT, cadence TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    IF p_start_date IS NOT NULL AND p_start_date != '' THEN v_start_date := p_start_date::TIMESTAMPTZ; END IF;
    IF p_end_date IS NOT NULL AND p_end_date != '' THEN v_end_date := p_end_date::TIMESTAMPTZ; END IF;

    RETURN QUERY
    WITH base_data AS (
        -- PASSO 1: Filtrar e buscar score
        SELECT 
            c.*,
            (SELECT a.final_grade FROM call_analysis a WHERE a.call_id = c.id ORDER BY a.created_at DESC LIMIT 1) as score_val
        FROM calls c
        WHERE 
            (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
            AND (p_status IS NULL OR c.status_voip = p_status)
            AND (p_type IS NULL OR c.call_type = p_type)
            AND (v_start_date IS NULL OR c.created_at >= v_start_date)
            AND (v_end_date IS NULL OR c.created_at <= v_end_date)
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
            AND (p_min_score IS NULL OR (SELECT a.final_grade FROM call_analysis a WHERE a.call_id = c.id ORDER BY a.created_at DESC LIMIT 1) >= p_min_score)
            AND (p_search_query IS NULL OR p_search_query = '' OR 
                 c.enterprise ILIKE '%' || p_search_query || '%' OR c.person ILIKE '%' || p_search_query || '%' OR 
                 c.deal_id ILIKE '%' || p_search_query || '%' OR c.agent_id ILIKE '%' || p_search_query || '%')
    ),
    sorted_data AS (
        -- PASSO 2: Ordenar TUDO e contar
        SELECT *, COUNT(*) OVER() as total
        FROM base_data
        ORDER BY 
            CASE WHEN p_sort_by IN ('score', 'score_desc') THEN score_val END DESC NULLS LAST,
            CASE WHEN p_sort_by = 'score_asc' THEN score_val END ASC NULLS LAST,
            CASE WHEN p_sort_by IN ('duration', 'duration_desc') THEN duration END DESC,
            CASE WHEN p_sort_by = 'duration_asc' THEN duration END ASC,
            created_at DESC
    )
    -- PASSO 3: Paginar
    SELECT 
        sd.id, sd.provider_call_id, sd.deal_id,
        COALESCE(NULLIF(TRIM(sd.enterprise), ''), 'Empresa não informada') AS company_name,
        COALESCE(NULLIF(TRIM(sd.person), ''), 'Pessoa Desconhecida') AS person_name,
        sd.insights->>'person_email' AS person_email,
        sd.agent_id AS sdr_id,
        COALESCE(NULLIF(TRIM(sd.agent_id), ''), 'SDR') AS sdr_name,
        sd.agent_id AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(sd.agent_id, 'default') AS sdr_avatar_url,
        sd.status,
        COALESCE(sd.status_voip, sd.status) as status_voip,
        COALESCE(NULLIF(TRIM(sd.status_voip_friendly), ''), translate_status_voip(sd.status_voip)) AS status_voip_friendly,
        sd.duration, sd.duration AS duration_seconds, sd.duration_formated,
        sd.call_type, COALESCE(sd.direction, 'outbound') AS direction,
        sd.recording_url, sd.audio_bucket, sd.audio_path, sd.recording_url AS audio_url,
        sd.transcription,
        COALESCE(sd.transcript_status, 'pending') AS transcript_status,
        COALESCE(sd.ai_status, 'pending') AS ai_status,
        sd.insights, sd.scorecard, sd.score_val AS score,
        sd.from_number, sd.to_number, sd.agent_id,
        sd.created_at, sd.updated_at, sd.processed_at,
        sd.total AS total_count,
        sd.enterprise, sd.person,
        COALESCE(sd.insights->>'pipeline', 'N/A') AS pipeline,
        COALESCE(sd.insights->>'cadence', 'N/A') AS cadence
    FROM sorted_data sd
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated, anon, service_role;

-- =====================================================
-- TESTE DE SANIDADE (Execute sempre para validar)
-- =====================================================

-- TESTE 1: Página 1 (top 5 maiores durações)
SELECT 'TESTE 1: Página 1 - Top 5 MAIORES durações' as teste;
SELECT company_name, duration, duration_formated
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0, 'duration', NULL, NULL, NULL, NULL)
ORDER BY duration DESC;

-- TESTE 2: Página 11 (offset 50)
SELECT 'TESTE 2: Página 11 (offset 50)' as teste;
SELECT company_name, duration, duration_formated
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 50, 'duration', NULL, NULL, NULL, NULL)
ORDER BY duration DESC;

-- TESTE 3: Validação
SELECT 'TESTE 3: VALIDAÇÃO' as teste;
WITH 
p1 AS (SELECT MIN(duration) as min_dur FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0, 'duration', NULL, NULL, NULL, NULL)),
p2 AS (SELECT MAX(duration) as max_dur FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 50, 'duration', NULL, NULL, NULL, NULL))
SELECT 
    (SELECT min_dur FROM p1) as menor_pagina1,
    (SELECT max_dur FROM p2) as maior_pagina11,
    CASE 
        WHEN (SELECT min_dur FROM p1) >= (SELECT max_dur FROM p2)
        THEN '✅ CORRETO'
        ELSE '❌ ERRO'
    END as resultado;

SELECT '✅ Função atualizada! Sempre execute FIX-ORDENACAO-FINAL.sql antes de testar' as aviso;

