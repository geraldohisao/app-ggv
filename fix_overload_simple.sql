-- SOLUÇÃO SIMPLES: Remover função conflitante e recriar corretamente
-- Primeiro, listar todas as versões da função
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_calls_with_filters';

-- Dropar TODAS as versões da função
DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

-- Recriar APENAS a versão correta com timestamptz
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
  p_sdr text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort_by text DEFAULT 'created_at',
  p_min_duration integer DEFAULT NULL,
  p_max_duration integer DEFAULT NULL,
  p_min_score numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  provider_call_id text,
  deal_id text,
  enterprise text,
  sdr_id text,
  sdr_name text,
  sdr_email text,
  agent_id text,
  status text,
  status_voip text,
  status_voip_friendly text,
  duration integer,
  duration_seconds integer,
  call_type text,
  direction text,
  recording_url text,
  audio_bucket text,
  audio_path text,
  transcription text,
  transcript_status text,
  ai_status text,
  insights jsonb,
  scorecard jsonb,
  from_number text,
  to_number text,
  created_at timestamptz,
  updated_at timestamptz,
  processed_at timestamptz,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.provider_call_id,
    c.deal_id,
    COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') as enterprise,
    c.sdr_id,
    COALESCE(c.sdr_name, c.agent_id) as sdr_name,
    c.sdr_email,
    c.agent_id,
    c.status,
    c.status_voip,
    CASE 
      WHEN c.status_voip = 'normal_clearing' THEN 'Atendida'
      WHEN c.status_voip = 'no_answer' THEN 'Não atendida'
      WHEN c.status_voip = 'user_busy' THEN 'Ocupado'
      ELSE COALESCE(c.status_voip, c.status)
    END as status_voip_friendly,
    COALESCE(c.duration, 0) as duration,
    COALESCE(c.duration, 0) as duration_seconds,
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
    c.created_at,
    c.updated_at,
    c.processed_at,
    COUNT(*) OVER() as total_count
  FROM calls c
  WHERE 
    (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
    AND (p_status IS NULL OR c.status_voip = p_status)
    AND (p_type IS NULL OR c.call_type = p_type)
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    AND (p_min_duration IS NULL OR COALESCE(c.duration, 0) >= p_min_duration)
    AND (p_max_duration IS NULL OR COALESCE(c.duration, 0) <= p_max_duration)
  ORDER BY 
    CASE WHEN p_sort_by = 'created_at' THEN c.created_at END DESC,
    CASE WHEN p_sort_by = 'duration' THEN c.duration END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar grants
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated, anon;

