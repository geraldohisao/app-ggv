-- 43_refactor_get_calls_optimized.sql
-- REFATORAÇÃO: Simplificar get_calls_with_filters usando calls_enriched

-- =========================================
-- SUBSTITUIR FUNÇÃO COMPLEXA POR VERSÃO OTIMIZADA
-- =========================================

-- Remover função antiga
DROP FUNCTION IF EXISTS public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

-- Nova função simplificada usando calls_enriched
CREATE OR REPLACE FUNCTION public.get_calls_with_filters_v2(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
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
  duration INTEGER,
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
  score INTEGER,
  from_number TEXT,
  to_number TEXT,
  agent_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Usar CTE simples com calls_enriched (dados já computados)
  WITH filtered_calls AS (
    SELECT ce.*
    FROM calls_enriched ce
    WHERE 
      -- Filtros diretos (sem computação)
      (p_sdr_email IS NULL OR ce.sdr_email = p_sdr_email)
      AND (p_status IS NULL OR ce.status = p_status)
      AND (p_start_date IS NULL OR ce.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ce.created_at <= p_end_date)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR ce.company_name ILIKE '%' || p_search || '%'
        OR ce.deal_id ILIKE '%' || p_search || '%'
        OR ce.person_name ILIKE '%' || p_search || '%'
      )
  )
  SELECT 
    fc.id,
    fc.provider_call_id,
    fc.deal_id,
    fc.company_name,
    fc.person_name,
    fc.person_email,
    fc.sdr_email as sdr_id,
    fc.sdr_name,
    fc.sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(fc.sdr_email, 'default') as sdr_avatar_url,
    COALESCE(fc.status, 'received') as status,
    COALESCE(fc.duration, 0) as duration,
    COALESCE(fc.call_type, 'consultoria_vendas') as call_type,
    COALESCE(fc.direction, 'outbound') as direction,
    fc.recording_url,
    fc.audio_bucket,
    fc.audio_path,
    fc.audio_url,
    fc.transcription,
    COALESCE(fc.transcript_status, 'pending') as transcript_status,
    COALESCE(fc.ai_status, 'pending') as ai_status,
    COALESCE(fc.insights, '{}'::jsonb) as insights,
    COALESCE(fc.scorecard, '{}'::jsonb) as scorecard,
    fc.score,
    fc.from_number,
    fc.to_number,
    fc.agent_id,
    fc.created_at,
    fc.updated_at,
    fc.processed_at,
    COUNT(*) OVER() as total_count
  FROM filtered_calls fc
  ORDER BY fc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Criar alias para compatibilidade
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
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
  duration INTEGER,
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
  score INTEGER,
  from_number TEXT,
  to_number TEXT,
  agent_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM get_calls_with_filters_v2(p_limit, p_offset, p_sdr_email, p_status, p_start_date, p_end_date, p_search);
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters_v2(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role, anon;

-- Teste de performance
SELECT 'Performance Test - V2:' as test, COUNT(*) as calls_found 
FROM get_calls_with_filters_v2(10, 0) 
WHERE company_name IS NOT NULL;
