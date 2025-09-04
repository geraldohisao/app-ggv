-- Corrige a função get_call_details para usar duration_formated como fonte da verdade
-- e retorna também o campo duration_formated no payload

-- Garantir que não exista versão anterior com retorno diferente
DROP FUNCTION IF EXISTS public.get_call_details(UUID);

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
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
  duration_formated TEXT,
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
  comments JSONB,
  detailed_scores JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    COALESCE(c.provider_call_id, '') as provider_call_id,
    COALESCE(c.deal_id, '') as deal_id,
    COALESCE(
      NULLIF(TRIM(c.insights->>'company'), ''),
      NULLIF(TRIM(c.insights->>'companyName'), ''),
      c.enterprise,
      'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
    ) as company_name,
    COALESCE(
      NULLIF(TRIM(c.person), ''),
      NULLIF(TRIM(c.insights->>'person_name'), ''),
      NULLIF(TRIM(c.insights->'contact'->>'name'), ''),
      'Cliente não informado'
    ) as person_name,
    COALESCE(
      NULLIF(TRIM(c.person_email), ''),
      NULLIF(TRIM(c.insights->>'person_email'), ''),
      NULLIF(TRIM(c.insights->'contact'->>'email'), ''),
      ''
    ) as person_email,
    COALESCE(c.agent_id, '') as sdr_id,
    CASE 
      WHEN c.agent_id IS NOT NULL AND c.agent_id != '' THEN INITCAP(REPLACE(SPLIT_PART(c.agent_id, '@', 1), '.', ' '))
      ELSE 'SDR não identificado'
    END as sdr_name,
    COALESCE(c.agent_id, '') as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(c.agent_id, 'default') as sdr_avatar_url,
    COALESCE(c.status, 'received') as status,
    -- Duração real em segundos a partir de duration_formated (HH:MM:SS)
    CASE 
      WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER
      ELSE COALESCE(c.duration, 0)
    END as duration,
    c.duration_formated,
    COALESCE(c.call_type, 'consultoria_vendas') as call_type,
    COALESCE(c.direction, 'outbound') as direction,
    c.recording_url,
    c.audio_bucket,
    c.audio_path,
    CASE 
      WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
      WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
        'https://' || c.audio_bucket || '.supabase.co/storage/v1/object/public/' || c.audio_path
      ELSE NULL
    END as audio_url,
    c.transcription,
    COALESCE(c.transcript_status, 'pending') as transcript_status,
    COALESCE(c.ai_status, 'pending') as ai_status,
    COALESCE(c.insights, '{}'::jsonb) as insights,
    COALESCE(c.scorecard, '{}'::jsonb) as scorecard,
    CASE 
      WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
      WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
      WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
      ELSE NULL
    END as score,
    c.from_number,
    c.to_number,
    c.agent_id,
    c.created_at,
    c.updated_at,
    c.processed_at,
    '[]'::jsonb as comments,
    '[]'::jsonb as detailed_scores
  FROM calls c
  WHERE c.id = p_call_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO anon, authenticated, service_role;

-- Teste rápido
-- SELECT id, duration, duration_formated FROM get_call_details('<CALL_ID_AQUI>'::uuid);


