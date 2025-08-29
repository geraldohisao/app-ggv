-- 42_calls_system_optimized.sql
-- REFATORAÇÃO: Funções modulares e otimizadas

-- =========================================
-- 1. VIEWS MATERIALIZADAS PARA CACHE
-- =========================================

-- View materializada para dados enriquecidos de calls (atualizada a cada 5 minutos)
CREATE MATERIALIZED VIEW IF NOT EXISTS calls_enriched AS
SELECT 
  c.id,
  c.provider_call_id,
  c.deal_id,
  c.status,
  c.duration,
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
  c.agent_id,
  c.created_at,
  c.updated_at,
  c.processed_at,
  -- Campos computados (cache)
  extract_company_name(c.insights, c.deal_id, c.id) as company_name,
  (extract_person_data(c.insights)).person_name as person_name,
  (extract_person_data(c.insights)).person_email as person_email,
  normalize_sdr_email(c.agent_id) as sdr_email,
  get_sdr_display_name(c.agent_id) as sdr_name,
  CASE 
    WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
    WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
    WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
    ELSE NULL
  END as score,
  CASE 
    WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
    WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
      'https://' || c.audio_bucket || '.supabase.co/storage/v1/object/public/' || c.audio_path
    ELSE NULL
  END as audio_url
FROM calls c;

-- Índice único na view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_enriched_id ON calls_enriched(id);
CREATE INDEX IF NOT EXISTS idx_calls_enriched_sdr_email ON calls_enriched(sdr_email);
CREATE INDEX IF NOT EXISTS idx_calls_enriched_status_created ON calls_enriched(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_enriched_company ON calls_enriched(company_name);

-- =========================================
-- 2. FUNÇÃO SIMPLIFICADA PARA LISTAGEM
-- =========================================

-- Função otimizada usando a view materializada
CREATE OR REPLACE FUNCTION get_calls_optimized(
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
  sdr_name TEXT,
  sdr_email TEXT,
  sdr_avatar_url TEXT,
  status TEXT,
  duration INTEGER,
  call_type TEXT,
  direction TEXT,
  audio_url TEXT,
  transcription TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_calls AS (
    SELECT ce.*
    FROM calls_enriched ce
    WHERE 
      (p_sdr_email IS NULL OR ce.sdr_email = p_sdr_email)
      AND (p_status IS NULL OR ce.status = p_status)
      AND (p_start_date IS NULL OR ce.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ce.created_at <= p_end_date)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR ce.company_name ILIKE '%' || p_search || '%'
        OR ce.deal_id ILIKE '%' || p_search || '%'
      )
  )
  SELECT 
    fc.id,
    fc.provider_call_id,
    fc.deal_id,
    fc.company_name,
    fc.person_name,
    fc.person_email,
    fc.sdr_name,
    fc.sdr_email,
    'https://i.pravatar.cc/64?u=' || COALESCE(fc.sdr_email, 'default') as sdr_avatar_url,
    COALESCE(fc.status, 'received') as status,
    COALESCE(fc.duration, 0) as duration,
    COALESCE(fc.call_type, 'consultoria_vendas') as call_type,
    COALESCE(fc.direction, 'outbound') as direction,
    fc.audio_url,
    fc.transcription,
    fc.score,
    fc.created_at,
    COUNT(*) OVER() as total_count
  FROM filtered_calls fc
  ORDER BY fc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- 3. FUNÇÃO DE CACHE PARA MÉTRICAS
-- =========================================

-- Tabela para cache de métricas
CREATE TABLE IF NOT EXISTS dashboard_metrics_cache (
  period_days INTEGER PRIMARY KEY,
  total_calls BIGINT,
  answered_calls BIGINT,
  answered_rate NUMERIC,
  avg_duration NUMERIC,
  total_sdrs BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função com cache inteligente
CREATE OR REPLACE FUNCTION get_dashboard_metrics_cached(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  total_calls BIGINT,
  answered_calls BIGINT,
  answered_rate NUMERIC,
  avg_duration NUMERIC,
  total_sdrs BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cache_valid BOOLEAN := FALSE;
  cached_data RECORD;
BEGIN
  -- Verificar se existe cache válido (menos de 5 minutos)
  SELECT * INTO cached_data
  FROM dashboard_metrics_cache 
  WHERE period_days = p_days 
    AND cached_at > NOW() - INTERVAL '5 minutes';
  
  IF FOUND THEN
    cache_valid := TRUE;
  END IF;

  -- Se cache inválido, recalcular
  IF NOT cache_valid THEN
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
        COUNT(DISTINCT sdr_email) FILTER (WHERE sdr_email IS NOT NULL) as unique_sdrs
      FROM calls_enriched ce, period p
      WHERE ce.created_at >= p.start_date AND ce.created_at <= p.end_date
    )
    INSERT INTO dashboard_metrics_cache (
      period_days, total_calls, answered_calls, answered_rate, 
      avg_duration, total_sdrs, period_start, period_end
    )
    SELECT 
      p_days,
      s.total,
      s.answered,
      CASE WHEN s.total > 0 THEN ROUND((s.answered::NUMERIC / s.total::NUMERIC) * 100, 1) ELSE 0 END,
      COALESCE(s.avg_dur, 0),
      s.unique_sdrs,
      p.start_date,
      p.end_date
    FROM call_stats s, period p
    ON CONFLICT (period_days) DO UPDATE SET
      total_calls = EXCLUDED.total_calls,
      answered_calls = EXCLUDED.answered_calls,
      answered_rate = EXCLUDED.answered_rate,
      avg_duration = EXCLUDED.avg_duration,
      total_sdrs = EXCLUDED.total_sdrs,
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      cached_at = NOW();

    -- Buscar dados atualizados
    SELECT * INTO cached_data
    FROM dashboard_metrics_cache 
    WHERE period_days = p_days;
  END IF;

  -- Retornar dados do cache
  RETURN QUERY
  SELECT 
    cached_data.total_calls,
    cached_data.answered_calls,
    cached_data.answered_rate,
    cached_data.avg_duration,
    cached_data.total_sdrs,
    cached_data.period_start,
    cached_data.period_end;
END;
$$;

-- =========================================
-- 4. FUNÇÃO PARA REFRESH DE CACHE
-- =========================================

CREATE OR REPLACE FUNCTION refresh_calls_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Refresh da view materializada
  REFRESH MATERIALIZED VIEW CONCURRENTLY calls_enriched;
  
  -- Limpar cache de métricas antigas
  DELETE FROM dashboard_metrics_cache WHERE cached_at < NOW() - INTERVAL '1 hour';
$$;

-- =========================================
-- 5. TRIGGER PARA AUTO-REFRESH
-- =========================================

-- Função trigger para invalidar cache
CREATE OR REPLACE FUNCTION invalidate_calls_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Invalidar cache de métricas
  DELETE FROM dashboard_metrics_cache;
  
  -- Agendar refresh da view materializada (em background)
  PERFORM pg_notify('refresh_calls_cache', '');
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger na tabela calls
DROP TRIGGER IF EXISTS trigger_invalidate_calls_cache ON calls;
CREATE TRIGGER trigger_invalidate_calls_cache
  AFTER INSERT OR UPDATE OR DELETE ON calls
  FOR EACH STATEMENT
  EXECUTE FUNCTION invalidate_calls_cache();

-- =========================================
-- 6. FUNÇÃO PARA BUSCA FULL-TEXT
-- =========================================

-- Adicionar coluna de busca full-text
ALTER TABLE calls ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Função para atualizar search_vector
CREATE OR REPLACE FUNCTION update_calls_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', COALESCE(NEW.deal_id, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->>'company', '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->>'person_name', '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.transcription, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Trigger para search_vector
DROP TRIGGER IF EXISTS trigger_update_calls_search_vector ON calls;
CREATE TRIGGER trigger_update_calls_search_vector
  BEFORE INSERT OR UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_calls_search_vector();

-- Índice GIN para busca full-text
CREATE INDEX IF NOT EXISTS idx_calls_search_vector ON calls USING gin(search_vector);

-- Função de busca full-text
CREATE OR REPLACE FUNCTION search_calls_fulltext(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  person_name TEXT,
  sdr_name TEXT,
  deal_id TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ce.id,
    ce.company_name,
    ce.person_name,
    ce.sdr_name,
    ce.deal_id,
    ce.created_at,
    ts_rank(c.search_vector, plainto_tsquery('portuguese', p_query)) as rank
  FROM calls c
  JOIN calls_enriched ce ON c.id = ce.id
  WHERE c.search_vector @@ plainto_tsquery('portuguese', p_query)
  ORDER BY rank DESC, ce.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- 7. PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION get_calls_optimized(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics_cached(INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION refresh_calls_cache() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_calls_fulltext(TEXT, INTEGER, INTEGER) TO authenticated, service_role, anon;

GRANT SELECT ON calls_enriched TO authenticated, service_role, anon;
GRANT SELECT ON dashboard_metrics_cache TO authenticated, service_role, anon;
