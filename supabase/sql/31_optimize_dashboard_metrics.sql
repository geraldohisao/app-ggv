-- 31_optimize_dashboard_metrics.sql
-- Funções otimizadas para métricas do dashboard de chamadas

-- =========================================
-- FUNÇÃO PARA MÉTRICAS GERAIS DO DASHBOARD
-- =========================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_calls BIGINT,
    answered_calls BIGINT,
    missed_calls BIGINT,
    avg_duration NUMERIC,
    answered_rate NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH call_stats AS (
        SELECT 
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('missed', 'failed')) as answered_calls,
            COUNT(*) FILTER (WHERE LOWER(status) IN ('missed', 'failed')) as missed_calls,
            AVG(duration) FILTER (WHERE duration > 0) as avg_duration
        FROM calls 
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
    )
    SELECT 
        total_calls,
        answered_calls,
        missed_calls,
        COALESCE(avg_duration, 0) as avg_duration,
        CASE 
            WHEN total_calls > 0 THEN 
                ROUND((answered_calls::NUMERIC / total_calls::NUMERIC) * 100, 1)
            ELSE 0 
        END as answered_rate
    FROM call_stats;
$$;

-- =========================================
-- FUNÇÃO PARA DADOS DO GRÁFICO DE VOLUME
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_volume_data(
    p_days INTEGER DEFAULT 14
)
RETURNS TABLE (
    date_key DATE,
    answered_count BIGINT,
    missed_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * (p_days - 1),
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as date_key
    ),
    daily_stats AS (
        SELECT 
            DATE(created_at) as call_date,
            COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('missed', 'failed')) as answered,
            COUNT(*) FILTER (WHERE LOWER(status) IN ('missed', 'failed')) as missed
        FROM calls 
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * (p_days - 1)
        GROUP BY DATE(created_at)
    )
    SELECT 
        ds.date_key,
        COALESCE(stats.answered, 0) as answered_count,
        COALESCE(stats.missed, 0) as missed_count
    FROM date_series ds
    LEFT JOIN daily_stats stats ON ds.date_key = stats.call_date
    ORDER BY ds.date_key;
$$;

-- =========================================
-- FUNÇÃO PARA MÉTRICAS POR SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.get_sdr_metrics(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    sdr_id TEXT,
    sdr_name TEXT,
    total_calls BIGINT,
    answered_calls BIGINT,
    avg_duration NUMERIC,
    avg_score NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
        COALESCE(um.full_name, p.full_name, 'Usuário ' || COALESCE(c.agent_id, SUBSTRING(c.sdr_id::TEXT, 1, 8))) as sdr_name,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE LOWER(c.status) NOT IN ('missed', 'failed')) as answered_calls,
        AVG(c.duration) FILTER (WHERE c.duration > 0) as avg_duration,
        AVG((c.scorecard->>'finalScore')::NUMERIC) FILTER (WHERE c.scorecard->>'finalScore' IS NOT NULL) as avg_score
    FROM calls c
    LEFT JOIN user_mapping um ON um.agent_id = c.agent_id OR um.sdr_id = c.sdr_id
    LEFT JOIN profiles p ON p.id = c.sdr_id
    WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY c.agent_id, c.sdr_id, um.full_name, p.full_name
    ORDER BY total_calls DESC;
$$;

-- =========================================
-- CONCEDER PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated;

-- =========================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- =========================================

-- Índice composto para consultas por data e status
CREATE INDEX IF NOT EXISTS idx_calls_created_at_status ON calls(created_at, status);

-- Índice para consultas por SDR
CREATE INDEX IF NOT EXISTS idx_calls_agent_sdr_created ON calls(agent_id, sdr_id, created_at);

-- Índice para scorecard
CREATE INDEX IF NOT EXISTS idx_calls_scorecard ON calls USING GIN(scorecard);
