-- ===================================================================
-- DASHBOARD COM FILTRO APENAS PARA LIGAÇÕES COM NOTAS
-- Funções otimizadas para mostrar apenas dados de ligações analisadas
-- ===================================================================

-- 1. Função para métricas de SDR baseada apenas em ligações com análises
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
    INNER JOIN call_analysis ca ON c.id = ca.call_id  -- APENAS ligações com análise
    LEFT JOIN profiles p ON p.id = c.sdr_id
    WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    AND ca.final_grade IS NOT NULL  -- Garantir que tem nota
    GROUP BY c.agent_id, c.sdr_id, p.name
    HAVING COUNT(*) > 0  -- Pelo menos uma ligação com análise
    ORDER BY AVG(ca.final_grade) DESC;  -- Ordenar por nota média decrescente
$$;

-- 2. Função para volume de chamadas apenas com análises
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
    WITH date_range AS (
        SELECT 
            CASE 
                WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
                    generate_series(p_start_date, p_end_date, INTERVAL '1 day')::DATE
                ELSE
                    generate_series(
                        CURRENT_DATE - INTERVAL '1 day' * (p_days - 1),
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::DATE
            END as date_key
    ),
    daily_stats AS (
        SELECT 
            DATE(c.created_at) as call_date,
            COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered,
            COUNT(*) FILTER (WHERE c.status_voip != 'normal_clearing') as missed
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id  -- APENAS ligações com análise
        WHERE 
            CASE 
                WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
                    DATE(c.created_at) BETWEEN p_start_date AND p_end_date
                ELSE
                    c.created_at >= CURRENT_DATE - INTERVAL '1 day' * (p_days - 1)
            END
        AND ca.final_grade IS NOT NULL  -- Garantir que tem nota
        GROUP BY DATE(c.created_at)
    )
    SELECT 
        dr.date_key,
        COALESCE(stats.answered, 0) as answered_count,
        COALESCE(stats.missed, 0) as missed_count
    FROM date_range dr
    LEFT JOIN daily_stats stats ON dr.date_key = stats.call_date
    ORDER BY dr.date_key;
$$;

-- 3. Função para métricas gerais do dashboard apenas com análises
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
    WITH call_stats AS (
        SELECT 
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered_calls,
            COUNT(*) FILTER (WHERE c.status_voip != 'normal_clearing') as missed_calls,
            AVG(c.duration) FILTER (WHERE c.duration > 0) as avg_duration,
            AVG(ca.final_grade) as avg_score
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id  -- APENAS ligações com análise
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND ca.final_grade IS NOT NULL  -- Garantir que tem nota
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
        END as answered_rate,
        COALESCE(ROUND(avg_score, 1), 0) as avg_score
    FROM call_stats;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO service_role;

-- 5. Comentários para documentação
COMMENT ON FUNCTION public.get_sdr_metrics_with_analysis IS 'Métricas de SDR baseadas APENAS em ligações com análises/notas';
COMMENT ON FUNCTION public.get_call_volume_data_with_analysis IS 'Volume de chamadas por dia APENAS para ligações com análises/notas';
COMMENT ON FUNCTION public.get_dashboard_metrics_with_analysis IS 'Métricas gerais do dashboard APENAS para ligações com análises/notas';

-- 6. Verificação
SELECT 'Funções de dashboard com análises criadas com sucesso!' as status;
