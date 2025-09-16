-- PASSO 2: Atualizar get_dashboard_metrics_with_analysis
-- Execute este bloco depois do passo 1:

DROP FUNCTION IF EXISTS public.get_dashboard_metrics_with_analysis CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_with_analysis(
    p_days INTEGER DEFAULT 14
)
RETURNS TABLE(
    total_calls BIGINT,
    answered_calls BIGINT,
    answered_rate NUMERIC,
    avg_duration NUMERIC,
    total_sdrs BIGINT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    v_period_start := NOW() - INTERVAL '1 day' * p_days;
    v_period_end := NOW();
    
    RETURN QUERY
    SELECT
        COUNT(c.id) AS total_calls,
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END)::NUMERIC / 
                NULLIF(COUNT(c.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        COALESCE(
            ROUND(
                AVG(CASE WHEN c.status_voip = 'normal_clearing' AND c.duration > 0 THEN c.duration END), 
                2
            ), 
            0
        ) AS avg_duration,
        COUNT(DISTINCT COALESCE(p.email_voip, c.agent_id)) AS total_sdrs,
        v_period_start AS period_start,
        v_period_end AS period_end
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.created_at >= v_period_start 
      AND c.created_at <= v_period_end
      AND ca.final_grade IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_with_analysis(INTEGER) TO authenticated, anon, service_role;
