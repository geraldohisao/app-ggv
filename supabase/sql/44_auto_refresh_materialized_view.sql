-- 44_auto_refresh_materialized_view.sql
-- AUTO-REFRESH: Sistema inteligente para atualizar calls_enriched

-- =========================================
-- TABELA DE CONTROLE DE REFRESH
-- =========================================

CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
  view_name TEXT PRIMARY KEY,
  last_refresh TIMESTAMPTZ DEFAULT NOW(),
  refresh_duration_ms INTEGER,
  rows_affected BIGINT,
  status TEXT DEFAULT 'success', -- 'success', 'failed', 'running'
  error_message TEXT,
  triggered_by TEXT DEFAULT 'auto'
);

-- Inserir registro inicial
INSERT INTO materialized_view_refresh_log (view_name, triggered_by)
VALUES ('calls_enriched', 'initial')
ON CONFLICT (view_name) DO NOTHING;

-- =========================================
-- FUNÇÃO DE REFRESH INTELIGENTE
-- =========================================

CREATE OR REPLACE FUNCTION refresh_calls_enriched_smart()
RETURNS TABLE (
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_affected BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
  rows_count BIGINT;
  last_refresh_time TIMESTAMPTZ;
  should_refresh BOOLEAN := FALSE;
BEGIN
  -- Verificar se precisa refresh (mais de 5 minutos ou nunca foi feito)
  SELECT last_refresh INTO last_refresh_time
  FROM materialized_view_refresh_log
  WHERE view_name = 'calls_enriched';

  IF last_refresh_time IS NULL OR last_refresh_time < NOW() - INTERVAL '5 minutes' THEN
    should_refresh := TRUE;
  END IF;

  -- Verificar se há mudanças na tabela calls desde o último refresh
  IF NOT should_refresh THEN
    SELECT COUNT(*) INTO rows_count
    FROM calls
    WHERE updated_at > last_refresh_time OR created_at > last_refresh_time;
    
    IF rows_count > 0 THEN
      should_refresh := TRUE;
    END IF;
  END IF;

  -- Se não precisa refresh, retornar status atual
  IF NOT should_refresh THEN
    RETURN QUERY
    SELECT 
      'calls_enriched'::TEXT,
      0::INTEGER,
      0::BIGINT,
      'skipped - no changes'::TEXT;
    RETURN;
  END IF;

  -- Marcar como running
  UPDATE materialized_view_refresh_log
  SET status = 'running', last_refresh = NOW()
  WHERE view_name = 'calls_enriched';

  -- Executar refresh
  start_time := clock_timestamp();
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY calls_enriched;
    
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Contar linhas na view
    SELECT COUNT(*) INTO rows_count FROM calls_enriched;
    
    -- Atualizar log de sucesso
    UPDATE materialized_view_refresh_log
    SET 
      last_refresh = end_time,
      refresh_duration_ms = duration_ms,
      rows_affected = rows_count,
      status = 'success',
      error_message = NULL
    WHERE view_name = 'calls_enriched';

    RETURN QUERY
    SELECT 
      'calls_enriched'::TEXT,
      duration_ms,
      rows_count,
      'success'::TEXT;

  EXCEPTION WHEN OTHERS THEN
    -- Log do erro
    UPDATE materialized_view_refresh_log
    SET 
      status = 'failed',
      error_message = SQLERRM,
      refresh_duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    WHERE view_name = 'calls_enriched';

    RETURN QUERY
    SELECT 
      'calls_enriched'::TEXT,
      EXTRACT(EPOCH FROM (clock_timestamp() - start_time))::INTEGER * 1000,
      0::BIGINT,
      ('failed: ' || SQLERRM)::TEXT;
  END;
END;
$$;

-- =========================================
-- TRIGGER PARA AUTO-REFRESH
-- =========================================

-- Função trigger que agenda refresh
CREATE OR REPLACE FUNCTION schedule_calls_enriched_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Usar NOTIFY para agendar refresh assíncrono
  PERFORM pg_notify('refresh_calls_enriched', json_build_object(
    'timestamp', NOW(),
    'operation', TG_OP,
    'table', TG_TABLE_NAME
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger na tabela calls (apenas para INSERT/UPDATE/DELETE significativos)
DROP TRIGGER IF EXISTS trigger_schedule_calls_refresh ON calls;
CREATE TRIGGER trigger_schedule_calls_refresh
  AFTER INSERT OR UPDATE OR DELETE ON calls
  FOR EACH STATEMENT -- Por statement, não por row (mais eficiente)
  EXECUTE FUNCTION schedule_calls_enriched_refresh();

-- =========================================
-- FUNÇÃO PARA REFRESH FORÇADO
-- =========================================

CREATE OR REPLACE FUNCTION force_refresh_calls_enriched()
RETURNS TABLE (
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_affected BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
  rows_count BIGINT;
BEGIN
  start_time := clock_timestamp();
  
  -- Marcar como running
  UPDATE materialized_view_refresh_log
  SET status = 'running', last_refresh = NOW(), triggered_by = 'manual'
  WHERE view_name = 'calls_enriched';

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY calls_enriched;
    
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    SELECT COUNT(*) INTO rows_count FROM calls_enriched;
    
    -- Atualizar log
    UPDATE materialized_view_refresh_log
    SET 
      last_refresh = end_time,
      refresh_duration_ms = duration_ms,
      rows_affected = rows_count,
      status = 'success',
      error_message = NULL,
      triggered_by = 'manual'
    WHERE view_name = 'calls_enriched';

    RETURN QUERY
    SELECT 
      'calls_enriched'::TEXT,
      duration_ms,
      rows_count,
      'success'::TEXT;

  EXCEPTION WHEN OTHERS THEN
    UPDATE materialized_view_refresh_log
    SET 
      status = 'failed',
      error_message = SQLERRM,
      triggered_by = 'manual'
    WHERE view_name = 'calls_enriched';

    RETURN QUERY
    SELECT 
      'calls_enriched'::TEXT,
      EXTRACT(EPOCH FROM (clock_timestamp() - start_time))::INTEGER * 1000,
      0::BIGINT,
      ('failed: ' || SQLERRM)::TEXT;
  END;
END;
$$;

-- =========================================
-- VIEW PARA MONITORAMENTO
-- =========================================

CREATE OR REPLACE VIEW materialized_view_status AS
SELECT 
  mvrl.view_name,
  mvrl.last_refresh,
  mvrl.refresh_duration_ms,
  mvrl.rows_affected,
  mvrl.status,
  mvrl.error_message,
  mvrl.triggered_by,
  CASE 
    WHEN mvrl.last_refresh < NOW() - INTERVAL '10 minutes' THEN 'stale'
    WHEN mvrl.status = 'failed' THEN 'error'
    WHEN mvrl.status = 'running' THEN 'refreshing'
    ELSE 'healthy'
  END as health_status,
  NOW() - mvrl.last_refresh as time_since_refresh
FROM materialized_view_refresh_log mvrl;

-- =========================================
-- PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION refresh_calls_enriched_smart() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION force_refresh_calls_enriched() TO authenticated, service_role;
GRANT SELECT ON materialized_view_status TO authenticated, service_role, anon;
GRANT SELECT ON materialized_view_refresh_log TO authenticated, service_role;

-- =========================================
-- TESTE DO SISTEMA
-- =========================================

-- Testar refresh inteligente
SELECT 'Smart Refresh Test:' as test, * FROM refresh_calls_enriched_smart();

-- Ver status
SELECT 'Status Check:' as test, * FROM materialized_view_status;
