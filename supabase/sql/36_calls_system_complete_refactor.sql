-- 36_calls_system_complete_refactor.sql
-- REFATORAÇÃO COMPLETA: Sistema de chamadas funcional 100%
-- Baseado na análise completa do frontend e backend

-- =========================================
-- ETAPA 1: LIMPAR SISTEMA ANTIGO
-- =========================================

-- Remover funções antigas
DROP FUNCTION IF EXISTS public.get_calls(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.get_calls_v2(INTEGER, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_calls_basic(INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_call_detail_basic(UUID);
DROP FUNCTION IF EXISTS public.get_unique_sdrs_basic();
DROP FUNCTION IF EXISTS public.normalize_sdr_email(TEXT);
DROP FUNCTION IF EXISTS public.get_sdr_name(TEXT);

-- =========================================
-- ETAPA 2: ESTRUTURA OTIMIZADA DE DADOS
-- =========================================

-- Garantir que a tabela calls tem todos os campos necessários
ALTER TABLE calls ADD COLUMN IF NOT EXISTS person_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS person_email TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sdr_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sdr_email TEXT;

-- Índices otimizados para as consultas do frontend
CREATE INDEX IF NOT EXISTS idx_calls_agent_id_normalized ON calls(LOWER(TRIM(agent_id)));
CREATE INDEX IF NOT EXISTS idx_calls_status_created ON calls(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_sdr_email ON calls(sdr_email);
CREATE INDEX IF NOT EXISTS idx_calls_company_name ON calls(company_name);
CREATE INDEX IF NOT EXISTS idx_calls_deal_id_btree ON calls(deal_id) WHERE deal_id IS NOT NULL;

-- =========================================
-- ETAPA 3: FUNÇÕES AUXILIARES
-- =========================================

-- Função para normalizar emails SDR
CREATE OR REPLACE FUNCTION public.normalize_sdr_email(email_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT 
    CASE 
      WHEN email_input IS NULL OR TRIM(email_input) = '' THEN NULL
      ELSE LOWER(
        REPLACE(
          REPLACE(
            REPLACE(TRIM(email_input), '@ggvinteligencia.com.br', '@grupoggv.com'),
            '@gggvinteligencia.com.br', '@grupoggv.com'
          ),
          '@ggv.com.br', '@grupoggv.com'
        )
      )
    END
$$;

-- Função para mapear nome do SDR
CREATE OR REPLACE FUNCTION public.get_sdr_display_name(agent_id TEXT)
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
        INITCAP(REPLACE(SPLIT_PART(agent_id, '@', 1), '.', ' '))
      ELSE 'SDR não identificado'
    END
$$;

-- Função para extrair dados da empresa do insights
CREATE OR REPLACE FUNCTION public.extract_company_name(insights JSONB, deal_id TEXT, call_id UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    COALESCE(
      NULLIF(TRIM(insights->>'company'), ''),
      NULLIF(TRIM(insights->'metadata'->>'company'), ''),
      NULLIF(TRIM(insights->>'organization'), ''),
      NULLIF(TRIM(insights->'contact'->>'company'), ''),
      NULLIF(TRIM(deal_id), ''),
      'Empresa ' || SUBSTRING(call_id::TEXT, 1, 8)
    )
$$;

-- Função para extrair dados da pessoa do insights
CREATE OR REPLACE FUNCTION public.extract_person_data(insights JSONB)
RETURNS TABLE(person_name TEXT, person_email TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    COALESCE(
      NULLIF(TRIM(insights->>'person_name'), ''),
      NULLIF(TRIM(insights->'metadata'->>'person_name'), ''),
      NULLIF(TRIM(insights->>'contact_name'), ''),
      NULLIF(TRIM(insights->'contact'->>'name'), ''),
      'Pessoa não informada'
    ) as person_name,
    COALESCE(
      NULLIF(TRIM(insights->>'person_email'), ''),
      NULLIF(TRIM(insights->'metadata'->>'person_email'), ''),
      NULLIF(TRIM(insights->>'contact_email'), ''),
      NULLIF(TRIM(insights->'contact'->>'email'), '')
    ) as person_email
$$;

-- =========================================
-- ETAPA 4: FUNÇÃO PRINCIPAL - DASHBOARD METRICS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_days INTEGER DEFAULT 14
)
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
      COUNT(DISTINCT normalize_sdr_email(agent_id)) FILTER (WHERE agent_id IS NOT NULL) as unique_sdrs
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

-- =========================================
-- ETAPA 5: FUNÇÃO PRINCIPAL - LISTAR CALLS
-- =========================================

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
      -- Filtro por SDR
      (p_sdr_email IS NULL OR normalize_sdr_email(c.agent_id) = normalize_sdr_email(p_sdr_email))
      -- Filtro por status
      AND (p_status IS NULL OR c.status = p_status)
      -- Filtro por data
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
      -- Filtro por busca (empresa ou deal_id)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR LOWER(extract_company_name(c.insights, c.deal_id, c.id)) ILIKE '%' || LOWER(p_search) || '%'
        OR LOWER(c.deal_id) ILIKE '%' || LOWER(p_search) || '%'
      )
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_calls
  ),
  enriched_calls AS (
    SELECT 
      c.*,
      extract_company_name(c.insights, c.deal_id, c.id) as computed_company,
      (extract_person_data(c.insights)).person_name as computed_person_name,
      (extract_person_data(c.insights)).person_email as computed_person_email,
      normalize_sdr_email(c.agent_id) as computed_sdr_email,
      get_sdr_display_name(c.agent_id) as computed_sdr_name,
      -- Extrair score do scorecard
      CASE 
        WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
        WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
        WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
        ELSE NULL
      END as computed_score
    FROM filtered_calls c
  )
  SELECT 
    ec.id,
    ec.provider_call_id,
    ec.deal_id,
    ec.computed_company as company_name,
    ec.computed_person_name as person_name,
    ec.computed_person_email as person_email,
    ec.computed_sdr_email as sdr_id,
    ec.computed_sdr_name as sdr_name,
    ec.computed_sdr_email as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(ec.computed_sdr_email, 'default') as sdr_avatar_url,
    COALESCE(ec.status, 'received') as status,
    COALESCE(ec.duration, 0) as duration,
    COALESCE(ec.call_type, 'consultoria_vendas') as call_type,
    COALESCE(ec.direction, 'outbound') as direction,
    ec.recording_url,
    ec.audio_bucket,
    ec.audio_path,
    CASE 
      WHEN ec.recording_url IS NOT NULL AND ec.recording_url != '' THEN ec.recording_url
      WHEN ec.audio_bucket IS NOT NULL AND ec.audio_path IS NOT NULL THEN 
        'https://' || ec.audio_bucket || '.supabase.co/storage/v1/object/public/' || ec.audio_path
      ELSE NULL
    END as audio_url,
    ec.transcription,
    COALESCE(ec.transcript_status, 'pending') as transcript_status,
    COALESCE(ec.ai_status, 'pending') as ai_status,
    COALESCE(ec.insights, '{}'::jsonb) as insights,
    COALESCE(ec.scorecard, '{}'::jsonb) as scorecard,
    ec.computed_score as score,
    ec.from_number,
    ec.to_number,
    ec.agent_id,
    ec.created_at,
    ec.updated_at,
    ec.processed_at,
    (SELECT count FROM total_count) as total_count
  FROM enriched_calls ec
  ORDER BY ec.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 6: FUNÇÃO PARA DETALHES DE UMA CALL
-- =========================================

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
  -- Dados extras para detalhes
  comments JSONB,
  detailed_scores JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH call_data AS (
    SELECT 
      c.*,
      extract_company_name(c.insights, c.deal_id, c.id) as computed_company,
      (extract_person_data(c.insights)).person_name as computed_person_name,
      (extract_person_data(c.insights)).person_email as computed_person_email,
      normalize_sdr_email(c.agent_id) as computed_sdr_email,
      get_sdr_display_name(c.agent_id) as computed_sdr_name,
      -- Extrair score do scorecard
      CASE 
        WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
        WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
        WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
        ELSE NULL
      END as computed_score
    FROM calls c
    WHERE c.id = p_call_id
  ),
  call_comments AS (
    SELECT 
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'text', cc.text,
            'at_seconds', cc.at_seconds,
            'author_name', cc.author_name,
            'created_at', cc.created_at
          ) ORDER BY cc.created_at
        ) FILTER (WHERE cc.id IS NOT NULL),
        '[]'::jsonb
      ) as comments
    FROM call_comments cc
    WHERE cc.call_id = p_call_id
  ),
  call_detailed_scores AS (
    SELECT 
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'criterion_id', cs.criterion_id,
            'score', cs.score,
            'justification', cs.justification
          )
        ) FILTER (WHERE cs.id IS NOT NULL),
        '[]'::jsonb
      ) as detailed_scores
    FROM call_scores cs
    WHERE cs.call_id = p_call_id
  )
  SELECT 
    cd.id,
    cd.provider_call_id,
    cd.deal_id,
    cd.computed_company as company_name,
    cd.computed_person_name as person_name,
    cd.computed_person_email as person_email,
    cd.computed_sdr_email as sdr_id,
    cd.computed_sdr_name as sdr_name,
    cd.computed_sdr_email as sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(cd.computed_sdr_email, 'default') as sdr_avatar_url,
    COALESCE(cd.status, 'received') as status,
    COALESCE(cd.duration, 0) as duration,
    COALESCE(cd.call_type, 'consultoria_vendas') as call_type,
    COALESCE(cd.direction, 'outbound') as direction,
    cd.recording_url,
    cd.audio_bucket,
    cd.audio_path,
    CASE 
      WHEN cd.recording_url IS NOT NULL AND cd.recording_url != '' THEN cd.recording_url
      WHEN cd.audio_bucket IS NOT NULL AND cd.audio_path IS NOT NULL THEN 
        'https://' || cd.audio_bucket || '.supabase.co/storage/v1/object/public/' || cd.audio_path
      ELSE NULL
    END as audio_url,
    cd.transcription,
    COALESCE(cd.transcript_status, 'pending') as transcript_status,
    COALESCE(cd.ai_status, 'pending') as ai_status,
    COALESCE(cd.insights, '{}'::jsonb) as insights,
    COALESCE(cd.scorecard, '{}'::jsonb) as scorecard,
    cd.computed_score as score,
    cd.from_number,
    cd.to_number,
    cd.agent_id,
    cd.created_at,
    cd.updated_at,
    cd.processed_at,
    cc.comments,
    cds.detailed_scores
  FROM call_data cd
  CROSS JOIN call_comments cc
  CROSS JOIN call_detailed_scores cds;
$$;

-- =========================================
-- ETAPA 7: FUNÇÃO PARA LISTAR SDRS ÚNICOS
-- =========================================

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
    normalize_sdr_email(c.agent_id) as sdr_email,
    get_sdr_display_name(c.agent_id) as sdr_name,
    'https://i.pravatar.cc/64?u=' || COALESCE(normalize_sdr_email(c.agent_id), 'default') as sdr_avatar_url,
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
    AND normalize_sdr_email(c.agent_id) IS NOT NULL
  GROUP BY normalize_sdr_email(c.agent_id), get_sdr_display_name(c.agent_id)
  ORDER BY call_count DESC, sdr_name;
$$;

-- =========================================
-- ETAPA 8: FUNÇÃO PARA DADOS DE GRÁFICOS
-- =========================================

-- Gráfico de volume de chamadas por dia
CREATE OR REPLACE FUNCTION public.get_call_volume_chart(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  date DATE,
  total_calls BIGINT,
  answered_calls BIGINT,
  missed_calls BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '1 day' * (p_days - 1),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE as date
  )
  SELECT 
    ds.date,
    COALESCE(COUNT(c.id), 0) as total_calls,
    COALESCE(COUNT(c.id) FILTER (WHERE c.status NOT IN ('failed', 'missed')), 0) as answered_calls,
    COALESCE(COUNT(c.id) FILTER (WHERE c.status IN ('failed', 'missed')), 0) as missed_calls
  FROM date_series ds
  LEFT JOIN calls c ON DATE(c.created_at) = ds.date
  GROUP BY ds.date
  ORDER BY ds.date;
$$;

-- Gráfico de scores por SDR
CREATE OR REPLACE FUNCTION public.get_sdr_score_chart(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  sdr_name TEXT,
  avg_score NUMERIC,
  call_count BIGINT,
  score_trend TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH period_calls AS (
    SELECT 
      c.*,
      get_sdr_display_name(c.agent_id) as sdr_name,
      CASE 
        WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
        WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
        WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
        ELSE NULL
      END as score
    FROM calls c
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
      AND c.agent_id IS NOT NULL
  )
  SELECT 
    pc.sdr_name,
    ROUND(AVG(pc.score) FILTER (WHERE pc.score IS NOT NULL), 1) as avg_score,
    COUNT(*) as call_count,
    CASE 
      WHEN AVG(pc.score) FILTER (WHERE pc.score IS NOT NULL) >= 85 THEN 'excellent'
      WHEN AVG(pc.score) FILTER (WHERE pc.score IS NOT NULL) >= 70 THEN 'good'
      WHEN AVG(pc.score) FILTER (WHERE pc.score IS NOT NULL) >= 50 THEN 'average'
      ELSE 'needs_improvement'
    END as score_trend
  FROM period_calls pc
  WHERE pc.sdr_name != 'SDR não identificado'
  GROUP BY pc.sdr_name
  HAVING COUNT(*) >= 3 -- Mínimo 3 chamadas para aparecer no gráfico
  ORDER BY avg_score DESC NULLS LAST, call_count DESC;
$$;

-- =========================================
-- ETAPA 9: CONCEDER PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION public.normalize_sdr_email(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_display_name(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extract_company_name(JSONB, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extract_person_data(JSONB) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_volume_chart(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_score_chart(INTEGER) TO authenticated, service_role;

-- =========================================
-- ETAPA 10: VERIFICAÇÃO E TESTES
-- =========================================

-- Teste das funções principais
SELECT 'Dashboard Metrics Test:' as test, * FROM get_dashboard_metrics(14);
SELECT 'Unique SDRs Test:' as test, sdr_name, call_count FROM get_unique_sdrs() LIMIT 5;
SELECT 'Calls List Test:' as test, COUNT(*) as total_calls FROM get_calls_with_filters(10, 0);
SELECT 'Call Volume Chart Test:' as test, COUNT(*) as days_with_data FROM get_call_volume_chart(7);

-- Verificar se há dados de teste
SELECT 
  'Data Verification:' as info,
  COUNT(*) as total_calls,
  COUNT(DISTINCT agent_id) as unique_agents,
  COUNT(*) FILTER (WHERE insights IS NOT NULL AND insights != '{}') as calls_with_insights,
  COUNT(*) FILTER (WHERE scorecard IS NOT NULL AND scorecard != '{}') as calls_with_scores
FROM calls;
