-- 001_calls_system_v2.sql
-- MIGRAÇÃO: Sistema de versionamento e modularização

-- =========================================
-- SISTEMA DE VERSIONAMENTO
-- =========================================

-- Tabela para controle de versões
CREATE TABLE IF NOT EXISTS schema_versions (
  version VARCHAR(20) PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT DEFAULT current_user,
  checksum TEXT,
  execution_time_ms INTEGER
);

-- Função para registrar versão
CREATE OR REPLACE FUNCTION register_schema_version(
  p_version TEXT,
  p_description TEXT,
  p_checksum TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO schema_versions (version, description, checksum)
  VALUES (p_version, p_description, p_checksum)
  ON CONFLICT (version) DO NOTHING;
END;
$$;

-- Registrar versão atual
SELECT register_schema_version('2.0.0', 'Sistema otimizado com cache e busca full-text');

-- =========================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- =========================================

-- Configurações otimizadas para o banco
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Configurações de memória (ajustar conforme servidor)
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET work_mem = '4MB';

-- =========================================
-- PARTICIONAMENTO DA TABELA CALLS
-- =========================================

-- Criar tabela particionada por mês (para grandes volumes)
CREATE TABLE IF NOT EXISTS calls_partitioned (
  LIKE calls INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Criar partições para os últimos 12 meses
DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
  i INTEGER;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * i);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'calls_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF calls_partitioned
      FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
  END LOOP;
END;
$$;

-- =========================================
-- SISTEMA DE AUDITORIA
-- =========================================

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT DEFAULT current_user,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT DEFAULT current_setting('application_name', true)
);

-- Função de auditoria genérica
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_values)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Aplicar auditoria na tabela calls
DROP TRIGGER IF EXISTS audit_calls_trigger ON calls;
CREATE TRIGGER audit_calls_trigger
  AFTER INSERT OR UPDATE OR DELETE ON calls
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =========================================
-- SISTEMA DE MÉTRICAS DE PERFORMANCE
-- =========================================

-- View para monitorar performance das queries
CREATE OR REPLACE VIEW query_performance AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%calls%'
ORDER BY total_time DESC;

-- Função para análise de performance
CREATE OR REPLACE FUNCTION analyze_calls_performance()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as calls_24h,
      AVG(duration) as avg_duration,
      COUNT(DISTINCT agent_id) as unique_agents
    FROM calls
  )
  SELECT 
    'Total Calls'::TEXT,
    s.total_calls::NUMERIC,
    CASE 
      WHEN s.total_calls > 100000 THEN 'Considere particionamento'
      ELSE 'Performance adequada'
    END::TEXT
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'Calls 24h'::TEXT,
    s.calls_24h::NUMERIC,
    CASE 
      WHEN s.calls_24h > 1000 THEN 'Alto volume - monitore cache'
      ELSE 'Volume normal'
    END::TEXT
  FROM stats s;
END;
$$;

-- =========================================
-- SISTEMA DE BACKUP AUTOMÁTICO
-- =========================================

-- Função para backup incremental
CREATE OR REPLACE FUNCTION backup_calls_incremental(p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 day')
RETURNS TABLE (
  backup_id UUID,
  records_count BIGINT,
  backup_size_mb NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  backup_uuid UUID := uuid_generate_v4();
  record_count BIGINT;
BEGIN
  -- Criar tabela de backup se não existir
  CREATE TABLE IF NOT EXISTS calls_backup (
    backup_id UUID,
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    data JSONB
  );

  -- Inserir dados incrementais
  INSERT INTO calls_backup (backup_id, data)
  SELECT 
    backup_uuid,
    to_jsonb(c.*)
  FROM calls c
  WHERE c.updated_at >= p_since;

  GET DIAGNOSTICS record_count = ROW_COUNT;

  RETURN QUERY
  SELECT 
    backup_uuid,
    record_count,
    (pg_total_relation_size('calls_backup') / 1024.0 / 1024.0)::NUMERIC(10,2);
END;
$$;

-- =========================================
-- SISTEMA DE LIMPEZA AUTOMÁTICA
-- =========================================

-- Função para limpeza de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data(p_days INTEGER DEFAULT 365)
RETURNS TABLE (
  table_name TEXT,
  deleted_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '1 day' * p_days;
  deleted_audit BIGINT;
  deleted_cache BIGINT;
BEGIN
  -- Limpar logs de auditoria antigos
  DELETE FROM audit_log WHERE changed_at < cutoff_date;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  -- Limpar cache de métricas antigo
  DELETE FROM dashboard_metrics_cache WHERE cached_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS deleted_cache = ROW_COUNT;

  RETURN QUERY VALUES 
    ('audit_log'::TEXT, deleted_audit),
    ('dashboard_metrics_cache'::TEXT, deleted_cache);
END;
$$;

-- =========================================
-- JOBS AUTOMÁTICOS (usando pg_cron se disponível)
-- =========================================

-- Refresh automático do cache (a cada 5 minutos)
-- SELECT cron.schedule('refresh-calls-cache', '*/5 * * * *', 'SELECT refresh_calls_cache();');

-- Limpeza automática (diariamente às 2h)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data(365);');

-- Backup incremental (diariamente às 3h)
-- SELECT cron.schedule('backup-incremental', '0 3 * * *', 'SELECT backup_calls_incremental();');

-- =========================================
-- PERMISSÕES
-- =========================================

GRANT SELECT ON schema_versions TO authenticated, service_role;
GRANT SELECT ON query_performance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analyze_calls_performance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION backup_calls_incremental(TIMESTAMPTZ) TO service_role;
