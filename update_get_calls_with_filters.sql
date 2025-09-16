-- =========================================
-- ATUALIZAR FUNÇÃO get_calls_with_filters COM STATUS VOIP
-- =========================================

-- Remover função existente e recriar com status_voip_friendly
DROP FUNCTION IF EXISTS public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 500,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    enterprise TEXT,
    person TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH total AS (
        SELECT COUNT(*) as count 
        FROM calls c
        WHERE (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
          AND (p_status IS NULL OR c.status_voip = p_status)
          AND (p_call_type IS NULL OR c.call_type = p_call_type)
          AND (p_start_date IS NULL OR c.created_at >= p_start_date)
          AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    )
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        c.enterprise,
        c.person,
        c.sdr_name,
        c.sdr_email,
        c.status,
        c.status_voip,
        public.map_status_voip(c.status_voip) as status_voip_friendly,
        c.duration,
        c.duration_formated,
        c.call_type,
        c.direction,
        c.recording_url,
        c.transcription,
        c.insights,
        c.scorecard,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        t.count as total_count
    FROM calls c, total t
    WHERE (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
      AND (p_status IS NULL OR c.status_voip = p_status)
      AND (p_call_type IS NULL OR c.call_type = p_call_type)
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO service_role;

-- =========================================
-- TESTE RÁPIDO (execute após criar a função)
-- =========================================

-- SELECT id, status_voip, status_voip_friendly, enterprise, person, duration
-- FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 3, 0);
