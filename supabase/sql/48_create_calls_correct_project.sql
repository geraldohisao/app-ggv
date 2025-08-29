-- 48_create_calls_correct_project.sql
-- SCRIPT COMPLETO: Criar tabela calls + funções RPC no projeto correto
-- Projeto: mwlekwyxbfbxfxskywgx

-- =========================================
-- 1. CRIAR TABELA CALLS (SE NÃO EXISTIR)
-- =========================================

CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_call_id TEXT,
    deal_id TEXT,
    agent_id TEXT,
    status TEXT DEFAULT 'received',
    duration INTEGER DEFAULT 0,
    call_type TEXT DEFAULT 'consultoria_vendas',
    direction TEXT DEFAULT 'outbound',
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    transcription TEXT,
    transcript_status TEXT DEFAULT 'pending',
    ai_status TEXT DEFAULT 'pending',
    insights JSONB DEFAULT '{}'::jsonb,
    scorecard JSONB DEFAULT '{}'::jsonb,
    from_number TEXT,
    to_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =========================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_deal_id ON public.calls(deal_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_insights_gin ON public.calls USING gin(insights);

-- =========================================
-- 3. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- =========================================

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados e anônimos
DROP POLICY IF EXISTS "calls_select_policy" ON public.calls;
CREATE POLICY "calls_select_policy" ON public.calls
    FOR SELECT USING (true);

-- Política para permitir inserção para usuários autenticados
DROP POLICY IF EXISTS "calls_insert_policy" ON public.calls;
CREATE POLICY "calls_insert_policy" ON public.calls
    FOR INSERT WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
DROP POLICY IF EXISTS "calls_update_policy" ON public.calls;
CREATE POLICY "calls_update_policy" ON public.calls
    FOR UPDATE USING (true);

-- =========================================
-- 4. INSERIR DADOS DE TESTE (SE TABELA VAZIA)
-- =========================================

INSERT INTO public.calls (
    provider_call_id,
    deal_id,
    agent_id,
    status,
    duration,
    insights,
    scorecard,
    created_at
)
SELECT 
    'test_call_' || generate_series,
    'deal_' || generate_series,
    CASE (generate_series % 4)
        WHEN 0 THEN 'camila.ataliba@ggvinteligencia.com.br'
        WHEN 1 THEN 'andressa.santos@grupoggv.com'
        WHEN 2 THEN 'isabel.pestilho@ggvinteligencia.com.br'
        ELSE 'lo-ruama.oliveira@grupoggv.com'
    END,
    CASE (generate_series % 3)
        WHEN 0 THEN 'completed'
        WHEN 1 THEN 'received'
        ELSE 'missed'
    END,
    (random() * 1800 + 60)::INTEGER,
    jsonb_build_object(
        'company', 'Empresa ' || generate_series,
        'person_name', 'Cliente ' || generate_series,
        'person_email', 'cliente' || generate_series || '@empresa.com'
    ),
    jsonb_build_object(
        'finalScore', (random() * 100)::INTEGER,
        'total_score', (random() * 100)::INTEGER
    ),
    NOW() - INTERVAL '1 day' * (random() * 30)
FROM generate_series(1, 25)
WHERE NOT EXISTS (SELECT 1 FROM public.calls LIMIT 1);

-- =========================================
-- 5. CRIAR FUNÇÕES RPC
-- =========================================

-- Função get_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  total_calls BIGINT,
  answered_calls BIGINT,
  answered_rate NUMERIC,
  avg_duration NUMERIC,
  total_sdrs BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH period AS (
    SELECT 
      NOW() - INTERVAL '1 day' * p_days as start_date,
      NOW() as end_date
  ),
  call_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status NOT IN ('failed', 'missed')) as answered,
      AVG(duration) FILTER (WHERE duration > 0) as avg_dur,
      COUNT(DISTINCT agent_id) FILTER (WHERE agent_id IS NOT NULL) as unique_sdrs
    FROM calls c, period p
    WHERE c.created_at >= p.start_date AND c.created_at <= p.end_date
  )
  SELECT 
    s.total as total_calls,
    s.answered as answered_calls,
    CASE WHEN s.total > 0 THEN ROUND((s.answered::NUMERIC / s.total::NUMERIC) * 100, 1) ELSE 0 END as answered_rate,
    COALESCE(s.avg_dur, 0) as avg_duration,
    s.unique_sdrs as total_sdrs,
    p.start_date as period_start,
    p.end_date as period_end
  FROM call_stats s, period p;
$$;

-- Função get_calls_with_filters
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
SET search_path = public
AS $$
  WITH filtered_calls AS (
    SELECT c.*
    FROM calls c
    WHERE 
      (p_sdr_email IS NULL OR LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p_sdr_email)))
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR c.deal_id ILIKE '%' || p_search || '%'
        OR c.insights->>'company' ILIKE '%' || p_search || '%'
      )
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_calls
  )
  SELECT 
    fc.id,
    fc.provider_call_id,
    fc.deal_id,
    COALESCE(
      NULLIF(TRIM(fc.insights->>'company'), ''),
      NULLIF(TRIM(fc.insights->'metadata'->>'company'), ''),
      NULLIF(TRIM(fc.deal_id), ''),
      'Empresa ' || SUBSTRING(fc.id::TEXT, 1, 8)
    ) as company_name,
    COALESCE(
      NULLIF(TRIM(fc.insights->>'person_name'), ''),
      NULLIF(TRIM(fc.insights->'contact'->>'name'), ''),
      'Pessoa não informada'
    ) as person_name,
    NULLIF(TRIM(fc.insights->>'person_email'), '') as person_email,
    fc.agent_id as sdr_id,
    CASE 
      WHEN fc.agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
      WHEN fc.agent_id ILIKE '%andressa%' THEN 'Andressa Santos'
      WHEN fc.agent_id ILIKE '%isabel%' THEN 'Isabel Pestilho'
      WHEN fc.agent_id ILIKE '%loruama%' OR fc.agent_id ILIKE '%lo-ruama%' THEN 'Lô-Ruama Oliveira'
      WHEN fc.agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
      WHEN fc.agent_id ILIKE '%geraldo%' THEN 'Geraldo Hisao'
      WHEN fc.agent_id IS NOT NULL AND fc.agent_id != '' THEN 
        INITCAP(REPLACE(SPLIT_PART(fc.agent_id, '@', 1), '.', ' '))
      ELSE 'SDR não identificado'
    END as sdr_name,
    fc.agent_id as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(fc.agent_id, 'default') as sdr_avatar_url,
    COALESCE(fc.status, 'received') as status,
    COALESCE(fc.duration, 0) as duration,
    COALESCE(fc.call_type, 'consultoria_vendas') as call_type,
    COALESCE(fc.direction, 'outbound') as direction,
    fc.recording_url,
    fc.audio_bucket,
    fc.audio_path,
    CASE 
      WHEN fc.recording_url IS NOT NULL AND fc.recording_url != '' THEN fc.recording_url
      WHEN fc.audio_bucket IS NOT NULL AND fc.audio_path IS NOT NULL THEN 
        'https://' || fc.audio_bucket || '.supabase.co/storage/v1/object/public/' || fc.audio_path
      ELSE NULL
    END as audio_url,
    fc.transcription,
    COALESCE(fc.transcript_status, 'pending') as transcript_status,
    COALESCE(fc.ai_status, 'pending') as ai_status,
    COALESCE(fc.insights, '{}'::jsonb) as insights,
    COALESCE(fc.scorecard, '{}'::jsonb) as scorecard,
    CASE 
      WHEN fc.scorecard ? 'finalScore' THEN (fc.scorecard->>'finalScore')::INTEGER
      WHEN fc.scorecard ? 'total_score' THEN (fc.scorecard->>'total_score')::INTEGER
      WHEN fc.scorecard ? 'score' THEN (fc.scorecard->>'score')::INTEGER
      ELSE NULL
    END as score,
    fc.from_number,
    fc.to_number,
    fc.agent_id,
    fc.created_at,
    fc.updated_at,
    fc.processed_at,
    (SELECT count FROM total_count) as total_count
  FROM filtered_calls fc
  ORDER BY fc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Função get_call_details
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.provider_call_id,
    c.deal_id,
    COALESCE(
      NULLIF(TRIM(c.insights->>'company'), ''),
      NULLIF(TRIM(c.insights->'metadata'->>'company'), ''),
      NULLIF(TRIM(c.deal_id), ''),
      'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
    ) as company_name,
    COALESCE(
      NULLIF(TRIM(c.insights->>'person_name'), ''),
      NULLIF(TRIM(c.insights->'contact'->>'name'), ''),
      'Pessoa não informada'
    ) as person_name,
    NULLIF(TRIM(c.insights->>'person_email'), '') as person_email,
    c.agent_id as sdr_id,
    CASE 
      WHEN c.agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
      WHEN c.agent_id ILIKE '%andressa%' THEN 'Andressa Santos'
      WHEN c.agent_id ILIKE '%isabel%' THEN 'Isabel Pestilho'
      WHEN c.agent_id ILIKE '%loruama%' OR c.agent_id ILIKE '%lo-ruama%' THEN 'Lô-Ruama Oliveira'
      WHEN c.agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
      WHEN c.agent_id ILIKE '%geraldo%' THEN 'Geraldo Hisao'
      WHEN c.agent_id IS NOT NULL AND c.agent_id != '' THEN 
        INITCAP(REPLACE(SPLIT_PART(c.agent_id, '@', 1), '.', ' '))
      ELSE 'SDR não identificado'
    END as sdr_name,
    c.agent_id as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(c.agent_id, 'default') as sdr_avatar_url,
    COALESCE(c.status, 'received') as status,
    COALESCE(c.duration, 0) as duration,
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
$$;

-- Função get_unique_sdrs
CREATE OR REPLACE FUNCTION public.get_unique_sdrs()
RETURNS TABLE (
  sdr_email TEXT,
  sdr_name TEXT,
  sdr_avatar_url TEXT,
  call_count BIGINT,
  last_call_date TIMESTAMPTZ,
  avg_duration NUMERIC,
  success_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.agent_id as sdr_email,
    CASE 
      WHEN c.agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
      WHEN c.agent_id ILIKE '%andressa%' THEN 'Andressa Santos'
      WHEN c.agent_id ILIKE '%isabel%' THEN 'Isabel Pestilho'
      WHEN c.agent_id ILIKE '%loruama%' OR c.agent_id ILIKE '%lo-ruama%' THEN 'Lô-Ruama Oliveira'
      WHEN c.agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
      WHEN c.agent_id ILIKE '%geraldo%' THEN 'Geraldo Hisao'
      WHEN c.agent_id IS NOT NULL AND c.agent_id != '' THEN 
        INITCAP(REPLACE(SPLIT_PART(c.agent_id, '@', 1), '.', ' '))
      ELSE 'SDR não identificado'
    END as sdr_name,
    'https://i.pravatar.cc/64?u=' || COALESCE(c.agent_id, 'default') as sdr_avatar_url,
    COUNT(*) as call_count,
    MAX(c.created_at) as last_call_date,
    AVG(c.duration) FILTER (WHERE c.duration > 0) as avg_duration,
    ROUND(
      (COUNT(*) FILTER (WHERE c.status NOT IN ('failed', 'missed'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 
      1
    ) as success_rate
  FROM calls c
  WHERE c.agent_id IS NOT NULL 
    AND TRIM(c.agent_id) != ''
  GROUP BY c.agent_id
  ORDER BY call_count DESC;
$$;

-- =========================================
-- 6. CONCEDER PERMISSÕES
-- =========================================

GRANT ALL ON TABLE public.calls TO authenticated, service_role;
GRANT SELECT ON TABLE public.calls TO anon;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO authenticated, service_role, anon;

-- =========================================
-- 7. TESTES FINAIS
-- =========================================

-- Verificar se a tabela foi criada
SELECT 'Tabela calls criada:' as status, COUNT(*) as registros FROM calls;

-- Testar cada função
SELECT 'Dashboard Test:' as test, total_calls FROM get_dashboard_metrics(7) LIMIT 1;
SELECT 'Calls Test:' as test, COUNT(*) as calls_found FROM get_calls_with_filters(5, 0);
SELECT 'SDRs Test:' as test, COUNT(*) as sdrs_found FROM get_unique_sdrs();

-- Verificar permissões
SELECT 'Permissões verificadas' as status;
