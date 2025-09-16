-- =========================================
-- SCRIPT SIMPLES - ATUALIZAR FUNÇÕES DASHBOARD COM EMAIL_VOIP
-- Versão compatível sem erros de snippet
-- =========================================

-- 1. Atualizar get_call_volume_data_with_analysis
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - p_days);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        c.created_at::DATE as date_key,
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN 1 END) as answered_count,
        COUNT(CASE WHEN c.status_voip != 'normal_clearing' OR c.status_voip IS NULL THEN 1 END) as missed_count
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.created_at::DATE >= v_start_date 
      AND c.created_at::DATE <= v_end_date
      AND ca.final_grade IS NOT NULL
    GROUP BY c.created_at::DATE
    ORDER BY c.created_at::DATE;
END;
$$;

-- 2. Atualizar get_dashboard_metrics_with_analysis
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
SECURITY DEFINER
AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    v_period_start := NOW() - INTERVAL '1 day' * p_days;
    v_period_end := NOW();
    
    RETURN QUERY
    SELECT
        COUNT(c.id) AS total_calls,
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END)::NUMERIC / 
                NULLIF(COUNT(c.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        COALESCE(
            ROUND(
                AVG(CASE WHEN c.status_voip = 'normal_clearing' AND c.duration > 0 THEN c.duration END), 
                2
            ), 
            0
        ) AS avg_duration,
        COUNT(DISTINCT COALESCE(p.email_voip, c.agent_id)) AS total_sdrs,
        v_period_start AS period_start,
        v_period_end AS period_end
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.created_at >= v_period_start 
      AND c.created_at <= v_period_end
      AND ca.final_grade IS NOT NULL;
END;
$$;

-- 3. Atualizar get_call_details
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
        COALESCE(
            c.insights->>'company', 
            c.insights->>'enterprise',
            c.insights->>'company_name',
            'Empresa não informada'
        ) as company_name,
        COALESCE(
            c.insights->>'person', 
            c.insights->>'person_name',
            c.insights->>'contact_name'
        ) as person_name,
        c.insights->>'person_email' as person_email,
        COALESCE(p.email_voip, c.agent_id) as sdr_id,
        COALESCE(p.full_name, c.agent_id) as sdr_name,
        COALESCE(p.email_voip, c.agent_id) as sdr_email,
        COALESCE(p.avatar_url, 'https://i.pravatar.cc/64?u=' || c.agent_id) as sdr_avatar_url,
        c.status,
        c.status_voip,
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

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated, anon, service_role;

-- 5. Teste simples
SELECT 'Funções dashboard atualizadas para usar email_voip!' as status;
