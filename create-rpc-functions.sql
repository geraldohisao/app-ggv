-- Script para criar as funções RPC do sistema de chamadas
-- Execute este script no Supabase SQL Editor APÓS executar o fix-scorecards-table.sql

-- =========================================
-- FUNÇÃO get_calls_v2
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
           COALESCE(p.full_name, um.full_name) as sdr_name,
           COALESCE(p.email, um.email) as sdr_email
    FROM calls c
    LEFT JOIN profiles p ON c.sdr_id = p.id
    LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
    WHERE (p_sdr_id IS NULL OR c.sdr_id = p_sdr_id OR c.agent_id = p_sdr_id::TEXT)
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
-- FUNÇÃO get_call_details
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
    COALESCE(p.full_name, um.full_name) as sdr_name,
    COALESCE(p.email, um.email) as sdr_email,
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
  LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
  WHERE c.id = p_call_id;
$$;

-- =========================================
-- FUNÇÃO get_calls_metrics
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
    WHERE (p_sdr_id IS NULL OR sdr_id = p_sdr_id OR agent_id = p_sdr_id::TEXT)
      AND (p_start IS NULL OR created_at >= p_start)
      AND (p_end IS NULL OR created_at <= p_end)
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_calls,
      COUNT(CASE WHEN status IN ('answered', 'processed') THEN 1 END) as answered_calls,
      COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
      AVG(duration) as avg_duration,
      SUM(duration) as total_duration,
      COUNT(CASE WHEN transcription IS NOT NULL AND transcription != '' THEN 1 END) as with_transcription,
      COUNT(CASE WHEN recording_url IS NOT NULL AND recording_url != '' THEN 1 END) as with_audio
    FROM filtered_calls
  ),
  call_type_stats AS (
    SELECT jsonb_object_agg(call_type, count) as by_call_type
    FROM (
      SELECT call_type, COUNT(*) as count
      FROM filtered_calls
      WHERE call_type IS NOT NULL
      GROUP BY call_type
    ) t
  ),
  status_stats AS (
    SELECT jsonb_object_agg(status, count) as by_status
    FROM (
      SELECT status, COUNT(*) as count
      FROM filtered_calls
      GROUP BY status
    ) s
  )
  SELECT
    m.total_calls,
    m.answered_calls,
    m.missed_calls,
    ROUND(m.avg_duration, 2) as avg_duration,
    m.total_duration,
    m.with_transcription,
    m.with_audio,
    COALESCE(ct.by_call_type, '{}'::jsonb) as by_call_type,
    COALESCE(st.by_status, '{}'::jsonb) as by_status
  FROM metrics m
  CROSS JOIN call_type_stats ct
  CROSS JOIN status_stats st;
$$;

-- =========================================
-- VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se as funções foram criadas
SELECT 'VERIFICAÇÃO DAS FUNÇÕES RPC' as status;

SELECT 'Testando get_calls_v2...' as test;
SELECT COUNT(*) as total_calls FROM get_calls_v2(10, 0, NULL, NULL, NULL, NULL, NULL);

SELECT 'Testando get_calls_metrics...' as test;
SELECT * FROM get_calls_metrics(NULL, NULL, NULL);

-- Verificar funções criadas
SELECT 'Verificando funções...' as test;
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('get_calls_v2', 'get_call_details', 'get_calls_metrics') 
        THEN '✅ Existe' 
        ELSE '❌ Não encontrada' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_calls_v2', 'get_call_details', 'get_calls_metrics')
ORDER BY routine_name;

-- Resumo final
SELECT '🎉 FUNÇÕES RPC CRIADAS COM SUCESSO!' as message
UNION ALL
SELECT '✅ get_calls_v2 - Listagem de chamadas com filtros'
UNION ALL
SELECT '✅ get_call_details - Detalhes de chamada individual'
UNION ALL
SELECT '✅ get_calls_metrics - Métricas agregadas'
UNION ALL
SELECT '✅ Sistema de chamadas completamente funcional!';
