-- ===================================================================
-- TESTE SIMPLES - Verificar se duração está sendo calculada
-- ===================================================================

-- 1. Verificar dados básicos
SELECT 
    'DADOS BÁSICOS' as teste,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN 1 END) as atendidas_com_duracao
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 2. Verificar duração média simples
SELECT 
    'DURAÇÃO MÉDIA SIMPLES' as teste,
    AVG(duration) as duracao_todas,
    AVG(CASE WHEN status_voip = 'normal_clearing' THEN duration END) as duracao_atendidas,
    AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) as duracao_atendidas_positiva
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 3. Testar função atual
SELECT 
    'FUNÇÃO ATUAL' as teste;

SELECT * FROM public.get_sdr_metrics(30) LIMIT 3;

-- 4. Forçar recriação da função com versão simplificada
DROP FUNCTION IF EXISTS public.get_sdr_metrics_test CASCADE;

CREATE OR REPLACE FUNCTION public.get_sdr_metrics_test(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    sdr_name TEXT,
    total_calls BIGINT,
    answered_calls BIGINT,
    avg_duration NUMERIC
)
LANGUAGE sql
AS $$
    SELECT 
        CASE 
            WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
            WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
            WHEN agent_id ILIKE '%andressa%' THEN 'Andressa Habinoski'
            ELSE 'Outros'
        END as sdr_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        AVG(CASE 
            WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration::NUMERIC 
            ELSE NULL 
        END) as avg_duration
    FROM calls 
    WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
    AND agent_id IS NOT NULL
    AND agent_id != ''
    GROUP BY sdr_name
    HAVING COUNT(*) > 0
    ORDER BY total_calls DESC;
$$;

-- 5. Testar função simplificada
SELECT 
    'FUNÇÃO SIMPLIFICADA' as teste;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    ROUND(avg_duration / 60, 1) as avg_minutes
FROM public.get_sdr_metrics_test(30);

SELECT 'TESTE COMPLETO' as status;
