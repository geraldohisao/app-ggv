-- Corrigir função get_calls_with_filters completamente
-- Remove função existente e recria sem filtro de agent_id

-- 1. Remover função existente
DROP FUNCTION IF EXISTS get_calls_with_filters(text,text,text,text,text,integer,integer);

-- 2. Recriar função corrigida
CREATE OR REPLACE FUNCTION get_calls_with_filters(
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_type TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_call_id TEXT,
  from_number TEXT,
  to_number TEXT,
  agent_id TEXT,
  status TEXT,
  status_voip TEXT,
  status_voip_friendly TEXT,
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
BEGIN
  RETURN QUERY
  SELECT 
    fc.id,
    fc.provider_call_id,
    fc.from_number,
    fc.to_number,
    fc.agent_id,
    fc.status,
    fc.status_voip,
    fc.status_voip_friendly,
    fc.duration,
    fc.duration_formated,
    fc.call_type,
    fc.direction,
    fc.recording_url,
    fc.audio_bucket,
    fc.audio_path,
    fc.transcription,
    fc.transcript_status,
    fc.ai_status,
    fc.sdr_name,
    fc.sdr_email,
    fc.enterprise,
    fc.person,
    fc.deal_id,
    -- person_name com lógica melhorada
    COALESCE(
      CASE WHEN fc.person IS NOT NULL AND TRIM(fc.person) != '' THEN TRIM(fc.person) END,
      CASE WHEN fc.insights->>'personName' IS NOT NULL THEN TRIM(fc.insights->>'personName') END,
      CASE WHEN fc.insights->>'person' IS NOT NULL THEN TRIM(fc.insights->>'person') END,
      CASE WHEN fc.insights->'contact'->>'name' IS NOT NULL THEN TRIM(fc.insights->'contact'->>'name') END,
      'Contato ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
    ) AS person_name,
    fc.person_email,
    -- company_name com lógica melhorada
    COALESCE(
      CASE WHEN fc.enterprise IS NOT NULL AND TRIM(fc.enterprise) != '' THEN TRIM(fc.enterprise) END,
      CASE WHEN fc.insights->>'companyName' IS NOT NULL THEN TRIM(fc.insights->>'companyName') END,
      CASE WHEN fc.insights->>'enterprise' IS NOT NULL THEN TRIM(fc.insights->>'enterprise') END,
      CASE WHEN fc.insights->'contact'->>'company' IS NOT NULL THEN TRIM(fc.insights->'contact'->>'company') END,
      'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
    ) AS company_name,
    fc.insights,
    fc.scorecard,
    fc.created_at
  FROM calls fc
  WHERE 
    -- Filtros opcionais (SEM filtro obrigatório de agent_id)
    (p_sdr_email IS NULL OR fc.sdr_email = p_sdr_email)
    AND (p_status IS NULL OR fc.status_voip = p_status)
    AND (p_call_type IS NULL OR fc.call_type = p_call_type)
    AND (p_start_date IS NULL OR fc.created_at >= p_start_date::TIMESTAMPTZ)
    AND (p_end_date IS NULL OR fc.created_at <= p_end_date::TIMESTAMPTZ)
  ORDER BY fc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Testar função corrigida
SELECT 'Testando função corrigida...' as status;

SELECT 
  COUNT(*) as total_calls,
  MAX(duration) as max_duration,
  COUNT(CASE WHEN duration > 300 THEN 1 END) as long_calls,
  COUNT(CASE WHEN agent_id IS NOT NULL THEN 1 END) as with_agent_id,
  COUNT(CASE WHEN agent_id IS NULL THEN 1 END) as without_agent_id
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

-- 4. Mostrar chamadas longas que agora devem aparecer
SELECT 'CHAMADAS LONGAS AGORA DISPONÍVEIS:' as info;
SELECT 
  id,
  duration,
  duration_formated,
  sdr_name,
  person,
  call_type,
  agent_id IS NOT NULL as tem_agent_id,
  recording_url IS NOT NULL as tem_recording_url,
  created_at
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
WHERE duration > 300
ORDER BY duration DESC
LIMIT 10;

SELECT 'Correção aplicada! Chamadas longas devem aparecer no frontend agora.' as resultado;
