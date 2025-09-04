-- Corrigir sistema para usar duration_formated como fonte da verdade
-- O campo duration está incorreto, duration_formated tem os valores reais

-- 1. Remover função existente
DROP FUNCTION IF EXISTS get_calls_with_filters(text,text,text,text,text,integer,integer,integer,integer,text);

-- 2. Recriar função usando duration_formated convertido para segundos
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
  duration INTEGER, -- Será duration_formated convertido para segundos
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
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.provider_call_id,
    c.from_number,
    c.to_number,
    c.agent_id,
    c.status,
    c.status_voip,
    -- Usar duration_formated convertido para segundos como duration
    CASE 
      WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
        EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER
      ELSE c.duration
    END as duration,
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
    (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
    AND (p_status IS NULL OR c.status_voip = p_status)
    AND (p_call_type IS NULL OR c.call_type = p_call_type)
    AND (p_start_date IS NULL OR c.created_at >= p_start_date::TIMESTAMPTZ)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date::TIMESTAMPTZ)
    AND (
      p_min_duration IS NULL OR 
      CASE 
        WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
          EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER >= p_min_duration
        ELSE c.duration >= p_min_duration
      END
    )
    AND (
      p_max_duration IS NULL OR 
      CASE 
        WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
          EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER <= p_max_duration
        ELSE c.duration <= p_max_duration
      END
    )
  ORDER BY 
    CASE 
      WHEN p_sort_by = 'duration' THEN
        CASE 
          WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
            EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER
          ELSE c.duration
        END
      ELSE NULL
    END DESC NULLS LAST,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Testar função corrigida
SELECT 'Testando função com duration_formated...' as status;

-- Teste com duração mínima usando duration_formated
SELECT 
  COUNT(*) as calls_over_60s,
  MAX(
    CASE 
      WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
        EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER
      ELSE duration
    END
  ) as max_duration_real
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  1000, 0, 
  60, NULL, 
  'duration'
);

-- 4. Mostrar chamadas longas reais
SELECT 'CHAMADAS LONGAS ENCONTRADAS:' as info;
SELECT 
  id,
  duration as duration_original,
  duration_formated,
  duration as duration_corrigido, -- Agora vem da função corrigida
  sdr_name,
  person
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  10, 0, 
  300, NULL, -- Chamadas > 5 minutos
  'duration'
);

SELECT 'Função corrigida para usar duration_formated!' as resultado;
