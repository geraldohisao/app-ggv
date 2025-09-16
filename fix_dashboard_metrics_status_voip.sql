-- =========================================
-- CORRIGIR get_dashboard_metrics PARA USAR status_voip
-- =========================================

-- 1. Verificar função atual
SELECT 
    '=== VERIFICANDO FUNÇÃO get_dashboard_metrics ATUAL ===' as info;

-- 2. Corrigir função para usar status_voip ao invés de status
DROP FUNCTION IF EXISTS public.get_dashboard_metrics CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_days INTEGER DEFAULT 14)
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
STABLE
AS $$
DECLARE
    v_period_start TIMESTAMPTZ := NOW() - INTERVAL '1 day' * p_days;
    v_period_end TIMESTAMPTZ := NOW();
BEGIN
    RETURN QUERY
    SELECT
        COUNT(c.id) AS total_calls,
        -- CORRIGIDO: usar status_voip = 'normal_clearing' ao invés de status = 'processed'
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END)::NUMERIC / 
                NULLIF(COUNT(c.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        -- CORRIGIDO: duração média apenas das chamadas atendidas
        COALESCE(
            ROUND(
                AVG(CASE WHEN c.status_voip = 'normal_clearing' AND c.duration > 0 THEN c.duration END), 
                2
            ), 
            0
        ) AS avg_duration,
        COUNT(DISTINCT c.agent_id) AS total_sdrs,
        v_period_start AS period_start,
        v_period_end AS period_end
    FROM
        public.calls c
    WHERE
        c.created_at >= v_period_start 
        AND c.created_at <= v_period_end;
END;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO authenticated, anon, service_role;

-- 4. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as teste;

SELECT 
    total_calls,
    answered_calls,
    answered_rate,
    avg_duration,
    total_sdrs
FROM public.get_dashboard_metrics(14);

-- 5. Comparar com dados manuais para validar
SELECT 
    '=== VALIDAÇÃO MANUAL ===' as validacao;

SELECT 
    COUNT(*) as total_calls_manual,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls_manual,
    ROUND(
        (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
        2
    ) as answered_rate_manual,
    ROUND(
        AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END), 
        2
    ) as avg_duration_manual
FROM calls 
WHERE created_at >= NOW() - INTERVAL '14 days';

SELECT 'Função get_dashboard_metrics corrigida para usar status_voip!' as status;
