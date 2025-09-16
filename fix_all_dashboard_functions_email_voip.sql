-- =========================================
-- ATUALIZAR TODAS AS FUNÇÕES DO DASHBOARD PARA email_voip
-- Script completo para garantir consistência total
-- =========================================

-- 1. Verificar funções existentes
SELECT 
    '=== FUNÇÕES EXISTENTES RELACIONADAS A SDR/DASHBOARD ===' as info;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%sdr%' OR routine_name LIKE '%dashboard%' OR routine_name LIKE '%call_volume%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- =========================================
-- 2. ATUALIZAR get_call_volume_data_with_analysis
-- =========================================

DROP FUNCTION IF EXISTS public.get_call_volume_data_with_analysis CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_volume_data_with_analysis(
    p_days INTEGER DEFAULT 14,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    date_key DATE,
    answered_count BIGINT,
    missed_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH date_range AS (
        SELECT 
            COALESCE(p_start_date, CURRENT_DATE - INTERVAL '1 day' * p_days) as start_date,
            COALESCE(p_end_date, CURRENT_DATE) as end_date
    ),
    call_data AS (
        SELECT 
            c.created_at::DATE as call_date,
            c.status_voip,
            -- Usar email_voip do profile se disponível
            COALESCE(p.email_voip, c.agent_id) as sdr_identifier
        FROM calls c
        LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        CROSS JOIN date_range dr
        WHERE c.created_at::DATE >= dr.start_date 
          AND c.created_at::DATE <= dr.end_date
          AND ca.final_grade IS NOT NULL
    )
    SELECT 
        call_date as date_key,
        COUNT(*) FILTER (WHERE status_voip = 'normal_clearing') as answered_count,
        COUNT(*) FILTER (WHERE status_voip != 'normal_clearing') as missed_count
    FROM call_data
    GROUP BY call_date
    ORDER BY call_date;
$$;

-- =========================================
-- 3. ATUALIZAR get_dashboard_metrics_with_analysis
-- =========================================

DROP FUNCTION IF EXISTS public.get_dashboard_metrics_with_analysis CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_with_analysis(
    p_days INTEGER DEFAULT 14
)
RETURNS TABLE(
    total_calls BIGINT,
    answered_calls BIGINT,
    answered_rate NUMERIC,
    avg_duration NUMERIC,
    total_sdrs BIGINT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_period_start TIMESTAMPTZ := NOW() - INTERVAL '1 day' * p_days;
    v_period_end TIMESTAMPTZ := NOW();
BEGIN
    RETURN QUERY
    WITH analyzed_calls AS (
        SELECT 
            c.id,
            c.status_voip,
            c.duration,
            c.created_at,
            -- Usar email_voip do profile se disponível
            COALESCE(p.email_voip, c.agent_id) as sdr_identifier
        FROM calls c
        LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        WHERE c.created_at >= v_period_start 
          AND c.created_at <= v_period_end
          AND ca.final_grade IS NOT NULL
    )
    SELECT
        COUNT(ac.id) AS total_calls,
        COUNT(CASE WHEN ac.status_voip = 'normal_clearing' THEN ac.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN ac.status_voip = 'normal_clearing' THEN ac.id END)::NUMERIC / 
                NULLIF(COUNT(ac.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        COALESCE(
            ROUND(
                AVG(CASE WHEN ac.status_voip = 'normal_clearing' AND ac.duration > 0 THEN ac.duration END), 
                2
            ), 
            0
        ) AS avg_duration,
        COUNT(DISTINCT ac.sdr_identifier) AS total_sdrs,
        v_period_start AS period_start,
        v_period_end AS period_end
    FROM analyzed_calls ac;
END;
$$;

-- =========================================
-- 4. ATUALIZAR get_call_details (se usar dados de SDR)
-- =========================================

DROP FUNCTION IF EXISTS public.get_call_details CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE(
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
    duration_formatted TEXT,
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
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    comments JSONB,
    detailed_scores JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- Empresa
        COALESCE(
            c.insights->>'company', 
            c.insights->>'enterprise',
            c.insights->>'company_name',
            'Empresa não informada'
        ) as company_name,
        -- Pessoa
        COALESCE(
            c.insights->>'person', 
            c.insights->>'person_name',
            c.insights->>'contact_name'
        ) as person_name,
        c.insights->>'person_email' as person_email,
        
        -- SDR usando email_voip se disponível
        COALESCE(p.email_voip, c.agent_id) as sdr_id,
        COALESCE(p.full_name, c.agent_id) as sdr_name,
        COALESCE(p.email_voip, c.agent_id) as sdr_email,
        COALESCE(p.avatar_url, 'https://i.pravatar.cc/64?u=' || c.agent_id) as sdr_avatar_url,
        
        c.status,
        c.status_voip,
        -- Status friendly
        CASE c.status_voip
            WHEN 'normal_clearing' THEN 'Atendida'
            WHEN 'no_answer' THEN 'Não atendida'
            WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
            WHEN 'number_changed' THEN 'Numero mudou'
            WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
            WHEN 'unallocated_number' THEN 'Número não encontrado'
            ELSE COALESCE(c.status_voip, 'Status desconhecido')
        END as status_voip_friendly,
        
        c.duration,
        -- Duration formatted
        CASE 
            WHEN c.duration IS NULL OR c.duration = 0 THEN '00:00:00'
            WHEN c.duration >= 3600 THEN 
                LPAD(FLOOR(c.duration / 3600)::TEXT, 2, '0') || ':' ||
                LPAD(FLOOR((c.duration % 3600) / 60)::TEXT, 2, '0') || ':' ||
                LPAD((c.duration % 60)::TEXT, 2, '0')
            ELSE 
                '00:' ||
                LPAD(FLOOR(c.duration / 60)::TEXT, 2, '0') || ':' ||
                LPAD((c.duration % 60)::TEXT, 2, '0')
        END as duration_formatted,
        
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        COALESCE(c.recording_url, CONCAT(COALESCE(c.audio_bucket, ''), '/', COALESCE(c.audio_path, ''))) as audio_url,
        c.transcription,
        c.transcript_status,
        c.ai_status,
        c.insights,
        c.scorecard,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.processed_at,
        c.comments,
        c.detailed_scores
        
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    WHERE c.id = p_call_id;
END;
$$;

-- =========================================
-- 5. CONCEDER PERMISSÕES PARA TODAS AS FUNÇÕES
-- =========================================

-- get_call_volume_data_with_analysis
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO service_role;

-- get_dashboard_metrics_with_analysis
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO service_role;

-- get_call_details
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO service_role;

-- =========================================
-- 6. TESTES FINAIS
-- =========================================

SELECT 
    '=== TESTANDO FUNÇÕES ATUALIZADAS ===' as teste;

-- Teste get_sdr_metrics
SELECT 
    'get_sdr_metrics:' as funcao,
    COUNT(*) as total_sdrs
FROM public.get_sdr_metrics(30);

-- Teste get_sdr_metrics_with_analysis
SELECT 
    'get_sdr_metrics_with_analysis:' as funcao,
    COUNT(*) as total_sdrs_com_nota
FROM public.get_sdr_metrics_with_analysis(30);

-- Teste get_dashboard_metrics_with_analysis
SELECT 
    'get_dashboard_metrics_with_analysis:' as funcao,
    total_calls,
    total_sdrs
FROM public.get_dashboard_metrics_with_analysis(14);

-- Teste get_call_volume_data_with_analysis
SELECT 
    'get_call_volume_data_with_analysis:' as funcao,
    COUNT(*) as dias_com_dados
FROM public.get_call_volume_data_with_analysis(7);

SELECT 'TODAS AS FUNÇÕES DO DASHBOARD ATUALIZADAS PARA USAR EMAIL_VOIP!' as status;
