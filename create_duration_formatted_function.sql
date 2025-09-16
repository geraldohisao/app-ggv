-- CRIAR FUNÇÃO PARA BUSCAR CALLS COM DURATION_FORMATTED

CREATE OR REPLACE FUNCTION public.get_calls_with_formatted_duration(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL,
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at'
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
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
WITH filtered_calls AS (
    SELECT 
        c.*,
        -- Calcular duration_formatted
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
        -- Mapear status_voip para status_voip_friendly
        CASE c.status_voip
            WHEN 'normal_clearing' THEN 'Atendida'
            WHEN 'no_answer' THEN 'Não atendida'
            WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
            WHEN 'number_changed' THEN 'Numero mudou'
            WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
            WHEN 'unallocated_number' THEN 'Número não encontrado'
            ELSE COALESCE(c.status_voip, 'Status desconhecido')
        END as status_voip_friendly,
        -- Campos derivados
        COALESCE(c.insights->>'company', c.insights->>'enterprise') as company_name,
        COALESCE(c.insights->>'person', c.insights->>'person_name') as person_name,
        c.insights->>'person_email' as person_email,
        c.agent_id as sdr_id,
        c.agent_id as sdr_name,
        c.agent_id as sdr_email,
        CONCAT('https://i.pravatar.cc/64?u=', c.agent_id) as sdr_avatar_url,
        COALESCE(c.recording_url, c.audio_bucket || '/' || c.audio_path) as audio_url
    FROM calls c
    WHERE 
        (p_sdr_email IS NULL OR c.agent_id ILIKE '%' || p_sdr_email || '%')
        AND (p_status IS NULL OR c.status_voip = p_status)
        AND (p_call_type IS NULL OR c.call_type = p_call_type)
        AND (p_start IS NULL OR c.created_at >= p_start)
        AND (p_end IS NULL OR c.created_at <= p_end)
        AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
        AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
),
total_count AS (
    SELECT COUNT(*) as count FROM filtered_calls
)
SELECT 
    fc.id,
    fc.provider_call_id,
    fc.deal_id,
    fc.company_name,
    fc.person_name,
    fc.person_email,
    fc.sdr_id,
    fc.sdr_name,
    fc.sdr_email,
    fc.sdr_avatar_url,
    fc.status,
    fc.status_voip,
    fc.status_voip_friendly,
    fc.duration,
    fc.duration_formatted,
    fc.call_type,
    fc.direction,
    fc.recording_url,
    fc.audio_bucket,
    fc.audio_path,
    fc.audio_url,
    fc.transcription,
    fc.transcript_status,
    fc.ai_status,
    fc.insights,
    fc.scorecard,
    fc.from_number,
    fc.to_number,
    fc.agent_id,
    fc.created_at,
    fc.updated_at,
    fc.processed_at,
    tc.count as total_count
FROM filtered_calls fc, total_count tc
ORDER BY 
    CASE 
        WHEN p_sort_by = 'duration' THEN fc.duration
        ELSE NULL
    END DESC,
    CASE 
        WHEN p_sort_by = 'created_at' OR p_sort_by IS NULL THEN fc.created_at
        ELSE NULL
    END DESC
LIMIT p_limit
OFFSET p_offset;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_calls_with_formatted_duration(INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_formatted_duration(INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT) TO service_role;

