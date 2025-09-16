-- =========================================
-- AJUSTAR DURAÇÃO MÉDIA PARA CHAMADAS SIGNIFICATIVAS
-- Considerar apenas chamadas atendidas com duração > 30s
-- =========================================

-- 1. Verificar distribuição atual de durações
SELECT 
    '=== DISTRIBUIÇÃO DE DURAÇÕES DAS CHAMADAS ATENDIDAS ===' as info;

SELECT 
    CASE 
        WHEN duration = 0 THEN '0s (sem duração)'
        WHEN duration <= 10 THEN '1-10s (muito curta)'
        WHEN duration <= 30 THEN '11-30s (curta)'
        WHEN duration <= 60 THEN '31-60s (normal)'
        WHEN duration <= 180 THEN '1-3min (boa)'
        WHEN duration <= 300 THEN '3-5min (longa)'
        ELSE '5min+ (muito longa)'
    END as faixa_duracao,
    COUNT(*) as quantidade,
    ROUND(AVG(duration), 1) as duracao_media_faixa
FROM calls 
WHERE status_voip = 'normal_clearing'
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY 
    CASE 
        WHEN duration = 0 THEN '0s (sem duração)'
        WHEN duration <= 10 THEN '1-10s (muito curta)'
        WHEN duration <= 30 THEN '11-30s (curta)'
        WHEN duration <= 60 THEN '31-60s (normal)'
        WHEN duration <= 180 THEN '1-3min (boa)'
        WHEN duration <= 300 THEN '3-5min (longa)'
        ELSE '5min+ (muito longa)'
    END
ORDER BY quantidade DESC;

-- 2. Corrigir função para considerar apenas chamadas significativas
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
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN c.id END)::NUMERIC / 
                NULLIF(COUNT(c.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        -- AJUSTADO: duração média apenas das chamadas atendidas com duração > 30s
        COALESCE(
            ROUND(
                AVG(CASE 
                    WHEN c.status_voip = 'normal_clearing' AND c.duration > 30 
                    THEN c.duration 
                END), 
                0
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

-- 4. Testar função ajustada
SELECT 
    '=== TESTANDO FUNÇÃO AJUSTADA ===' as teste;

SELECT 
    total_calls,
    answered_calls,
    answered_rate,
    avg_duration as duracao_media_significativas,
    total_sdrs
FROM public.get_dashboard_metrics(14);

-- 5. Comparar diferentes critérios de duração
SELECT 
    '=== COMPARAÇÃO DE CRITÉRIOS DE DURAÇÃO ===' as comparacao;

SELECT 
    'Todas atendidas' as criterio,
    COUNT(*) as chamadas,
    ROUND(AVG(duration), 1) as duracao_media
FROM calls 
WHERE status_voip = 'normal_clearing'
  AND created_at >= NOW() - INTERVAL '14 days'
UNION ALL
SELECT 
    'Atendidas > 30s' as criterio,
    COUNT(*) as chamadas,
    ROUND(AVG(duration), 1) as duracao_media
FROM calls 
WHERE status_voip = 'normal_clearing'
  AND duration > 30
  AND created_at >= NOW() - INTERVAL '14 days'
UNION ALL
SELECT 
    'Atendidas > 60s' as criterio,
    COUNT(*) as chamadas,
    ROUND(AVG(duration), 1) as duracao_media
FROM calls 
WHERE status_voip = 'normal_clearing'
  AND duration > 60
  AND created_at >= NOW() - INTERVAL '14 days';

SELECT 'Duração média ajustada para chamadas significativas (>30s)!' as status;
