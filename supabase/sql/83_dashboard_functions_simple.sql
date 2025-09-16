-- ===================================================================
-- DASHBOARD FUNCTIONS SIMPLES - Versão sem erros de SQL
-- Funções simplificadas que funcionam garantidamente
-- ===================================================================

-- 1. Função para métricas de SDR com análises (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.get_sdr_metrics_with_analysis(
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
        COALESCE(p.name, 'Usuário ' || COALESCE(c.agent_id, SUBSTRING(c.sdr_id::TEXT, 1, 8))) as sdr_name,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered_calls,
        AVG(c.duration) FILTER (WHERE c.duration > 0) as avg_duration,
        AVG(ca.final_grade) as avg_score
    FROM calls c
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    LEFT JOIN profiles p ON p.id = c.sdr_id
    WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    AND ca.final_grade IS NOT NULL
    GROUP BY c.agent_id, c.sdr_id, p.name
    HAVING COUNT(*) > 0
    ORDER BY AVG(ca.final_grade) DESC;
$$;

-- 2. Função para volume de chamadas com análises (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.get_call_volume_data_with_analysis(
    p_days INTEGER DEFAULT 14,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
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
    WITH filtered_calls AS (
        SELECT 
            DATE(c.created_at) as call_date,
            c.status_voip
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        WHERE 
            CASE 
                WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
                    DATE(c.created_at) >= p_start_date AND DATE(c.created_at) <= p_end_date
                ELSE
                    c.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
            END
        AND ca.final_grade IS NOT NULL
    ),
    daily_stats AS (
        SELECT 
            call_date,
            COUNT(*) FILTER (WHERE status_voip = 'normal_clearing') as answered,
            COUNT(*) FILTER (WHERE status_voip != 'normal_clearing') as missed
        FROM filtered_calls
        GROUP BY call_date
    ),
    all_dates AS (
        SELECT generate_series(
            COALESCE(p_start_date, CURRENT_DATE - INTERVAL '1 day' * (p_days - 1)),
            COALESCE(p_end_date, CURRENT_DATE),
            INTERVAL '1 day'
        )::DATE as date_key
    )
    SELECT 
        ds.date_key,
        COALESCE(stats.answered, 0) as answered_count,
        COALESCE(stats.missed, 0) as missed_count
    FROM all_dates ds
    LEFT JOIN daily_stats stats ON ds.date_key = stats.call_date
    ORDER BY ds.date_key;
$$;

-- 3. Função para métricas gerais do dashboard com análises (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_with_analysis(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_calls BIGINT,
    answered_calls BIGINT,
    missed_calls BIGINT,
    avg_duration NUMERIC,
    answered_rate NUMERIC,
    avg_score NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered_calls,
        COUNT(*) FILTER (WHERE c.status_voip != 'normal_clearing') as missed_calls,
        AVG(c.duration) FILTER (WHERE c.duration > 0) as avg_duration,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
            ELSE 0 
        END as answered_rate,
        ROUND(AVG(ca.final_grade), 1) as avg_score
    FROM calls c
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    AND ca.final_grade IS NOT NULL;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO service_role;

-- 5. Verificação
SELECT 'Funções de dashboard simplificadas criadas com sucesso!' as status;
