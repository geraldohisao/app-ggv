-- 35_calls_system_final_fix.sql
-- SOLUÇÃO DEFINITIVA: Sistema de chamadas funcionando 100%
-- Corrige todos os problemas identificados na análise

-- =========================================
-- ETAPA 1: LIMPAR FUNÇÕES ANTIGAS
-- =========================================

DROP FUNCTION IF EXISTS public.get_calls_basic(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_call_detail_basic(UUID);
DROP FUNCTION IF EXISTS public.get_unique_sdrs_basic();
DROP FUNCTION IF EXISTS public.get_calls_feed_fast(INTEGER, TIMESTAMPTZ, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.list_sdrs_fast();
DROP FUNCTION IF EXISTS public.list_sdrs_linked(BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.normalize_ggv_email(TEXT);

-- =========================================
-- ETAPA 2: ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at_desc ON public.calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_deal_id ON public.calls(deal_id);

-- =========================================
-- ETAPA 3: FUNÇÃO PARA NORMALIZAR EMAILS
-- =========================================

CREATE OR REPLACE FUNCTION public.normalize_sdr_email(email_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN email_input IS NULL OR TRIM(email_input) = '' THEN NULL
      ELSE LOWER(
        REPLACE(
          REPLACE(TRIM(email_input), '@ggvinteligencia.com.br', '@grupoggv.com'),
          '@gggvinteligencia.com.br', '@grupoggv.com'
        )
      )
    END
$$;

-- =========================================
-- ETAPA 4: FUNÇÃO PARA MAPEAR NOME DO SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.get_sdr_name(agent_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
      WHEN agent_id ILIKE '%andressa%' THEN 'Andressa Santos'
      WHEN agent_id ILIKE '%isabel%' THEN 'Isabel Pestilho'
      WHEN agent_id ILIKE '%loruama%' OR agent_id ILIKE '%lo-ruama%' THEN 'Lô-Ruama Oliveira'
      WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
      WHEN agent_id ILIKE '%geraldo%' THEN 'Geraldo Hisao'
      WHEN agent_id IS NOT NULL AND agent_id != '' THEN 
        INITCAP(SPLIT_PART(agent_id, '@', 1))
      ELSE 'SDR não identificado'
    END
$$;

-- =========================================
-- ETAPA 5: FUNÇÃO PRINCIPAL - LISTAR CALLS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_basic(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
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
  WITH filtered_calls AS (
    SELECT c.*
    FROM calls c
    WHERE (p_sdr_email IS NULL OR normalize_sdr_email(c.agent_id) = normalize_sdr_email(p_sdr_email))
      AND (p_status IS NULL OR c.status = p_status)
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_calls
  )
  SELECT 
    c.id,
    c.provider_call_id,
    c.deal_id,
    -- Empresa: tentar extrair do insights, senão usar deal_id
    COALESCE(
      NULLIF(TRIM(c.insights->>'company'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'company'), ''),
      NULLIF(TRIM(c.deal_id), ''),
      'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
    ) as company_name,
    -- Pessoa: tentar extrair do insights
    COALESCE(
      NULLIF(TRIM(c.insights->>'person_name'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'person_name'), ''),
      NULLIF(TRIM(c.insights->>'contact_name'), ''),
      'Pessoa não informada'
    ) as person_name,
    -- Email da pessoa
    COALESCE(
      NULLIF(TRIM(c.insights->>'person_email'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'person_email'), ''),
      NULLIF(TRIM(c.insights->>'contact_email'), '')
    ) as person_email,
    -- SDR info
    normalize_sdr_email(c.agent_id) as sdr_id,
    get_sdr_name(c.agent_id) as sdr_name,
    normalize_sdr_email(c.agent_id) as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(normalize_sdr_email(c.agent_id), 'default') as sdr_avatar_url,
    -- Call info
    COALESCE(c.status, 'received') as status,
    COALESCE(c.duration, 0) as duration,
    'consultoria_vendas' as call_type, -- Tipo padrão
    COALESCE(c.direction, 'outbound') as direction,
    -- Audio URLs
    c.recording_url,
    c.audio_bucket,
    c.audio_path,
    CASE 
      WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
      WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
        'https://' || c.audio_bucket || '.supabase.co/storage/v1/object/public/' || c.audio_path
      ELSE NULL
    END as audio_url,
    -- Transcription & AI
    c.transcription,
    COALESCE(c.transcript_status, 'pending') as transcript_status,
    COALESCE(c.ai_status, 'pending') as ai_status,
    COALESCE(c.insights, '{}'::jsonb) as insights,
    COALESCE(c.scorecard, '{}'::jsonb) as scorecard,
    -- Phone numbers
    c.from_number,
    c.to_number,
    c.agent_id,
    -- Timestamps
    c.created_at,
    c.updated_at,
    c.processed_at,
    -- Total count
    (SELECT count FROM total_count) as total_count
  FROM filtered_calls c
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 6: FUNÇÃO PARA DETALHES DE UMA CALL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_detail_basic(p_call_id UUID)
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
  from_number TEXT,
  to_number TEXT,
  agent_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.provider_call_id,
    c.deal_id,
    -- Empresa: tentar extrair do insights, senão usar deal_id
    COALESCE(
      NULLIF(TRIM(c.insights->>'company'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'company'), ''),
      NULLIF(TRIM(c.deal_id), ''),
      'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
    ) as company_name,
    -- Pessoa: tentar extrair do insights
    COALESCE(
      NULLIF(TRIM(c.insights->>'person_name'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'person_name'), ''),
      NULLIF(TRIM(c.insights->>'contact_name'), ''),
      'Pessoa não informada'
    ) as person_name,
    -- Email da pessoa
    COALESCE(
      NULLIF(TRIM(c.insights->>'person_email'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'person_email'), ''),
      NULLIF(TRIM(c.insights->>'contact_email'), '')
    ) as person_email,
    -- SDR info
    normalize_sdr_email(c.agent_id) as sdr_id,
    get_sdr_name(c.agent_id) as sdr_name,
    normalize_sdr_email(c.agent_id) as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(normalize_sdr_email(c.agent_id), 'default') as sdr_avatar_url,
    -- Call info
    COALESCE(c.status, 'received') as status,
    COALESCE(c.duration, 0) as duration,
    'consultoria_vendas' as call_type, -- Tipo padrão
    COALESCE(c.direction, 'outbound') as direction,
    -- Audio URLs
    c.recording_url,
    c.audio_bucket,
    c.audio_path,
    CASE 
      WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
      WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
        'https://' || c.audio_bucket || '.supabase.co/storage/v1/object/public/' || c.audio_path
      ELSE NULL
    END as audio_url,
    -- Transcription & AI
    c.transcription,
    COALESCE(c.transcript_status, 'pending') as transcript_status,
    COALESCE(c.ai_status, 'pending') as ai_status,
    COALESCE(c.insights, '{}'::jsonb) as insights,
    COALESCE(c.scorecard, '{}'::jsonb) as scorecard,
    -- Phone numbers
    c.from_number,
    c.to_number,
    c.agent_id,
    -- Timestamps
    c.created_at,
    c.updated_at,
    c.processed_at
  FROM calls c
  WHERE c.id = p_call_id;
$$;

-- =========================================
-- ETAPA 7: FUNÇÃO PARA LISTAR SDRS ÚNICOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs_basic()
RETURNS TABLE (
  sdr_email TEXT,
  sdr_name TEXT,
  sdr_avatar_url TEXT,
  call_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    normalize_sdr_email(c.agent_id) as sdr_email,
    get_sdr_name(c.agent_id) as sdr_name,
    'https://i.pravatar.cc/64?u=' || COALESCE(normalize_sdr_email(c.agent_id), 'default') as sdr_avatar_url,
    COUNT(*) as call_count
  FROM calls c
  WHERE c.agent_id IS NOT NULL 
    AND TRIM(c.agent_id) != ''
    AND normalize_sdr_email(c.agent_id) IS NOT NULL
  GROUP BY normalize_sdr_email(c.agent_id), get_sdr_name(c.agent_id)
  ORDER BY call_count DESC, sdr_name;
$$;

-- =========================================
-- ETAPA 8: CONCEDER PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION public.normalize_sdr_email(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_name(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_basic(INTEGER, INTEGER, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_detail_basic(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs_basic() TO authenticated, service_role;

-- =========================================
-- ETAPA 9: VERIFICAÇÃO FINAL
-- =========================================

-- Testar se as funções funcionam
SELECT 'Teste get_unique_sdrs_basic:' as test, COUNT(*) as sdr_count 
FROM get_unique_sdrs_basic();

SELECT 'Teste get_calls_basic:' as test, COUNT(*) as call_count 
FROM get_calls_basic(5, 0);

-- Mostrar alguns SDRs para verificar
SELECT 'SDRs encontrados:' as info, sdr_name, sdr_email, call_count 
FROM get_unique_sdrs_basic() 
LIMIT 5;
