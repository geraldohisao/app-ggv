-- Adicionar filtros de duração no backend
-- Para que funcionem mesmo com muitos dados

-- 1. Remover função existente
DROP FUNCTION IF EXISTS get_calls_with_filters(text,text,text,text,text,integer,integer);

-- 2. Recriar função com filtros de duração
CREATE OR REPLACE FUNCTION get_calls_with_filters(
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_type TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_min_duration INTEGER DEFAULT NULL,
  p_max_duration INTEGER DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at'
)
RETURNS TABLE (
  id UUID,
  provider_call_id TEXT,
  from_number TEXT,
  to_number TEXT,
  agent_id TEXT,
  status TEXT,
  status_voip TEXT,
  duration INTEGER,
  duration_formated TEXT,
  call_type TEXT,
  direction TEXT,
  recording_url TEXT,
  audio_bucket TEXT,
  audio_path TEXT,
  transcription TEXT,
  transcript_status TEXT,
  ai_status TEXT,
  sdr_name TEXT,
  sdr_email TEXT,
  enterprise TEXT,
  person TEXT,
  deal_id TEXT,
  person_name TEXT,
  person_email TEXT,
  company_name TEXT,
  insights JSONB,
  scorecard JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_clause TEXT;
BEGIN
  -- Determinar ordenação
  CASE p_sort_by
    WHEN 'duration' THEN order_clause := 'ORDER BY c.duration DESC NULLS LAST';
    WHEN 'score' THEN order_clause := 'ORDER BY c.scorecard DESC NULLS LAST, c.created_at DESC';
    WHEN 'company' THEN order_clause := 'ORDER BY c.company_name ASC NULLS LAST, c.created_at DESC';
    ELSE order_clause := 'ORDER BY c.created_at DESC';
  END CASE;

  RETURN QUERY EXECUTE format('
    SELECT 
      c.id,
      c.provider_call_id,
      c.from_number,
      c.to_number,
      c.agent_id,
      c.status,
      c.status_voip,
      c.duration,
      c.duration_formated,
      c.call_type,
      c.direction,
      c.recording_url,
      c.audio_bucket,
      c.audio_path,
      c.transcription,
      c.transcript_status,
      c.ai_status,
      c.sdr_name,
      c.sdr_email,
      c.enterprise,
      c.person,
      c.deal_id,
      c.person_name,
      c.person_email,
      c.company_name,
      c.insights,
      c.scorecard,
      c.created_at
    FROM calls c
    WHERE 
      ($1 IS NULL OR c.sdr_email = $1)
      AND ($2 IS NULL OR c.status_voip = $2)
      AND ($3 IS NULL OR c.call_type = $3)
      AND ($4 IS NULL OR c.created_at >= $4::TIMESTAMPTZ)
      AND ($5 IS NULL OR c.created_at <= $5::TIMESTAMPTZ)
      AND ($8 IS NULL OR c.duration >= $8)
      AND ($9 IS NULL OR c.duration <= $9)
    %s
    LIMIT $6
    OFFSET $7
  ', order_clause)
  USING p_sdr_email, p_status, p_call_type, p_start_date, p_end_date, 
        p_limit, p_offset, p_min_duration, p_max_duration;
END;
$$;

-- 3. Testar função com filtros de duração
SELECT 'Testando filtros de duração...' as status;

-- Teste 1: Apenas chamadas > 60 segundos
SELECT 
  COUNT(*) as calls_over_60s,
  MAX(duration) as max_duration,
  MIN(duration) as min_duration
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  1000, 0, 
  60, NULL, -- min_duration = 60, max_duration = NULL
  'duration'
);

-- Teste 2: Chamadas entre 60 e 300 segundos
SELECT 
  COUNT(*) as calls_60_to_300s
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  1000, 0, 
  60, 300, -- min_duration = 60, max_duration = 300
  'duration'
);

-- Teste 3: Apenas chamadas muito longas (> 300s)
SELECT 
  id,
  duration,
  duration_formated,
  sdr_name,
  person
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  10, 0, 
  300, NULL, -- min_duration = 300
  'duration'
)
ORDER BY duration DESC;

SELECT 'Filtros de duração implementados no backend!' as resultado;
