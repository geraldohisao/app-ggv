-- 26_update_calls_functions.sql
-- Atualiza funções de calls para incluir SDR info, transcrição, áudio e tipo de atividade
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- ATUALIZAR FUNÇÃO get_calls_v2 COMPLETA
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_v2(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    company TEXT,
    deal_id TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
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
  WITH base AS (
    SELECT c.*,
           p.full_name as sdr_name,
           p.email as sdr_email
    FROM calls c
    LEFT JOIN profiles p ON c.sdr_id = p.id
    WHERE (p_sdr_id IS NULL OR c.sdr_id = p_sdr_id)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_call_type IS NULL OR c.call_type = p_call_type)
      AND (p_start IS NULL OR c.created_at >= p_start)
      AND (p_end   IS NULL OR c.created_at <= p_end)
  ), total AS (SELECT COUNT(*) FROM base)
  SELECT
    b.id,
    b.provider_call_id,
    COALESCE(
        (b.insights->>'company'), 
        (b.insights->'metadata'->>'company'),
        'Empresa não informada'
    ) AS company,
    b.deal_id,
    b.sdr_id,
    b.sdr_name,
    b.sdr_email,
    b.status,
    b.duration,
    b.call_type,
    b.direction,
    b.recording_url,
    b.audio_bucket,
    b.audio_path,
    b.transcription,
    b.transcript_status,
    b.ai_status,
    b.insights,
    b.scorecard,
    b.from_number,
    b.to_number,
    b.agent_id,
    b.created_at,
    b.updated_at,
    b.processed_at,
    (SELECT * FROM total) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ATUALIZAR FUNÇÃO get_call_details COMPLETA
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    company TEXT,
    deal_id TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
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
    processed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        COALESCE(
            (c.insights->>'company'), 
            (c.insights->'metadata'->>'company'),
            'Empresa não informada'
        ) AS company,
        c.deal_id,
        c.sdr_id,
        p.full_name as sdr_name,
        p.email as sdr_email,
        p.avatar_url as sdr_avatar_url,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
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
        c.processed_at
    FROM calls c
    LEFT JOIN profiles p ON c.sdr_id = p.id
    WHERE c.id = p_call_id;
$$;

-- =========================================
-- NOVA FUNÇÃO PARA MÉTRICAS AVANÇADAS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_metrics(
    p_sdr_id UUID DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_calls BIGINT,
    answered_calls BIGINT,
    missed_calls BIGINT,
    avg_duration NUMERIC,
    total_duration BIGINT,
    with_transcription BIGINT,
    with_audio BIGINT,
    by_call_type JSONB,
    by_status JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered_calls AS (
        SELECT *
        FROM calls
        WHERE (p_sdr_id IS NULL OR sdr_id = p_sdr_id)
          AND (p_start IS NULL OR created_at >= p_start)
          AND (p_end IS NULL OR created_at <= p_end)
    )
    SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE status IN ('answered', 'processed')) as answered_calls,
        COUNT(*) FILTER (WHERE status = 'missed') as missed_calls,
        ROUND(AVG(duration), 2) as avg_duration,
        SUM(duration) as total_duration,
        COUNT(*) FILTER (WHERE transcription IS NOT NULL AND transcription != '') as with_transcription,
        COUNT(*) FILTER (WHERE recording_url IS NOT NULL OR (audio_bucket IS NOT NULL AND audio_path IS NOT NULL)) as with_audio,
        jsonb_object_agg(
            call_type, 
            call_type_count
        ) FILTER (WHERE call_type IS NOT NULL) as by_call_type,
        jsonb_object_agg(
            status, 
            status_count
        ) as by_status
    FROM (
        SELECT *,
               COUNT(*) OVER (PARTITION BY call_type) as call_type_count,
               COUNT(*) OVER (PARTITION BY status) as status_count
        FROM filtered_calls
    ) stats;
$$;

-- =========================================
-- GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.get_calls_v2(INTEGER, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_v2(INTEGER, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_calls_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script atualiza as funções de calls para incluir:
-- 1. Informações completas do SDR (nome, email, avatar)
-- 2. Dados de transcrição e status
-- 3. Informações de áudio (URL, bucket, path)
-- 4. Tipo de atividade e direção da chamada
-- 5. Função de métricas avançadas
-- 6. Todos os campos necessários para o frontend
