-- 🔧 CORRIGIR: Filtro de duração na RPC
-- Execute este script no SQL Editor do Supabase

-- 1. Testar sem filtro primeiro
SELECT 'Testando RPC sem filtro:' as info;
SELECT COUNT(*) as sem_filtro
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', null, null, null, null);

-- 2. Verificar se há ligações com duração >= 100
SELECT 'Ligações com duração >= 100:' as info;
SELECT COUNT(*) as calls_over_100s FROM calls WHERE duration >= 100;

-- 3. Verificar algumas ligações
SELECT 'Algumas ligações >= 100s:' as info;
SELECT id, duration, status_voip FROM calls WHERE duration >= 100 LIMIT 3;

-- 4. Recriar função com debug do filtro de duração
DROP FUNCTION IF EXISTS get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION get_calls_with_filters(
  p_sdr TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_min_duration INTEGER DEFAULT NULL,
  p_max_duration INTEGER DEFAULT NULL,
  p_min_score NUMERIC DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  provider_call_id TEXT,
  deal_id TEXT,
  status TEXT,
  duration INTEGER,
  duration_formated TEXT,
  call_type TEXT,
  direction TEXT,
  recording_url TEXT,
  transcription TEXT,
  insights JSONB,
  scorecard JSONB,
  agent_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status_voip TEXT,
  status_voip_friendly TEXT,
  enterprise TEXT,
  person TEXT,
  to_number TEXT,
  from_number TEXT,
  score NUMERIC,
  total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.provider_call_id,
    c.deal_id,
    c.status,
    c.duration,
    c.duration_formated,
    c.call_type,
    c.direction,
    c.recording_url,
    c.transcription,
    c.insights,
    c.scorecard,
    c.agent_id,
    c.created_at,
    c.updated_at,
    c.status_voip,
    -- Status traduzido
    CASE c.status_voip
      WHEN 'normal_clearing' THEN 'Atendida'
      WHEN 'no_answer' THEN 'Não Atendida'
      WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
      WHEN 'number_changed' THEN 'Número mudou'
      WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
      WHEN 'unallocated_number' THEN 'Número não encontrado'
      WHEN 'busy' THEN 'Ocupado'
      WHEN 'congestion' THEN 'Congestionado'
      WHEN 'unavailable' THEN 'Indisponível'
      WHEN 'rejected' THEN 'Rejeitada'
      WHEN 'failed' THEN 'Falhou'
      WHEN 'timeout' THEN 'Timeout'
      WHEN 'cancelled' THEN 'Cancelada'
      WHEN 'abandoned' THEN 'Abandonada'
      ELSE COALESCE(c.status_voip, 'Status desconhecido')
    END AS status_voip_friendly,
    COALESCE(c.enterprise,'N/A') AS enterprise,
    COALESCE(c.person,'N/A') AS person,
    c.to_number,
    c.from_number,
    -- Nota do call_analysis
    ca.final_grade AS score,
    COUNT(*) OVER() AS total_count
  FROM calls c
  LEFT JOIN call_analysis ca ON ca.call_id = c.id
  WHERE
    (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
    AND (p_status IS NULL OR c.status_voip = p_status)
    AND (p_type IS NULL OR c.call_type = p_type)
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
    AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
    AND (p_min_score IS NULL OR ca.final_grade >= p_min_score)
    AND (
      p_search_query IS NULL OR
      c.deal_id ILIKE '%' || p_search_query || '%' OR
      c.enterprise ILIKE '%' || p_search_query || '%' OR
      c.person ILIKE '%' || p_search_query || '%'
    )
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' THEN c.created_at END DESC,
    CASE WHEN p_sort_by = 'duration' THEN c.duration END DESC,
    CASE WHEN p_sort_by = 'score' THEN ca.final_grade END DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO service_role;

-- 5. Testar função corrigida
SELECT 'Testando função corrigida com duração >= 100:' as info;
SELECT COUNT(*) as resultado_corrigido
FROM get_calls_with_filters(null, null, null, null, null, 10, 0, 'created_at', 100, null, null, null);
