-- ===================================================================
-- DASHBOARD FUNCTIONS CORRIGIDAS - Versão que funciona mesmo sem dados
-- Funções com fallback inteligente para quando não há análises
-- ===================================================================

-- 1. Função para métricas de SDR com análises (CORRIGIDA)
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

-- 2. Função para volume de chamadas com análises (CORRIGIDA)
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
        SELECT date_key FROM (
            SELECT generate_series(
                COALESCE(p_start_date, CURRENT_DATE - INTERVAL '1 day' * (p_days - 1)),
                COALESCE(p_end_date, CURRENT_DATE),
                INTERVAL '1 day'
            )::DATE as date_key
        ) dates
    ),
    daily_stats AS (
        SELECT 
            DATE(c.created_at) as call_date,
            COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered,
            COUNT(*) FILTER (WHERE c.status_voip != 'normal_clearing') as missed
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id  -- APENAS ligações com análise
        WHERE c.created_at >= COALESCE(p_start_date::TIMESTAMPTZ, CURRENT_DATE - INTERVAL '1 day' * (p_days - 1))
        AND c.created_at <= COALESCE(p_end_date::TIMESTAMPTZ + INTERVAL '1 day' - INTERVAL '1 second', CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')
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

-- 3. Função para métricas gerais do dashboard com análises (CORRIGIDA)
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

-- 4. Função de fallback - usa dados originais se não há análises
CREATE OR REPLACE FUNCTION public.get_sdr_metrics_fallback(
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
        AVG((c.scorecard->>'finalScore')::NUMERIC) FILTER (WHERE c.scorecard->>'finalScore' IS NOT NULL) as avg_score
    FROM calls c
    LEFT JOIN profiles p ON p.id = c.sdr_id
    WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY c.agent_id, c.sdr_id, p.name
    ORDER BY total_calls DESC;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_fallback(INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_fallback(INTEGER) TO service_role;

-- 6. Verificação de dados
SELECT 'Funções de dashboard criadas com sucesso!' as status;

-- Verificar se existem dados de análise
SELECT 
    'Verificação de dados:' as info,
    (SELECT COUNT(*) FROM calls) as total_calls,
    (SELECT COUNT(*) FROM call_analysis) as total_analysis,
    CASE 
        WHEN (SELECT COUNT(*) FROM call_analysis) > 0 THEN 'Usar funções com análise'
        ELSE 'Usar funções de fallback'
    END as recomendacao;
