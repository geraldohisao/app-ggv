-- ===================================================================
-- DEBUG SIMPLES - SEM ERROS DE GROUP BY
-- ===================================================================

-- 1. Verificar dados brutos específicos da Mariana
SELECT 
    '=== DADOS BRUTOS MARIANA ===' as debug_step;

SELECT 
    id,
    agent_id,
    status_voip,
    duration,
    duration_formated,
    created_at::date
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se há chamadas atendidas COM duração
SELECT 
    '=== CHAMADAS ATENDIDAS COM DURAÇÃO ===' as debug_step;

SELECT 
    COUNT(*) as total_normal_clearing,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duration_field,
    COUNT(CASE WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN 1 END) as com_duration_formated,
    AVG(duration) as avg_duration_field,
    AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration_positive
FROM calls 
WHERE status_voip = 'normal_clearing'
AND created_at >= NOW() - INTERVAL '30 days';

-- 3. Teste manual SIMPLES para Mariana
SELECT 
    '=== TESTE MANUAL MARIANA ===' as debug_step;

SELECT 
    'Mariana Costa' as sdr_name,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN 1 END) as answered_with_duration,
    AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration::NUMERIC END) as avg_duration_seconds,
    ROUND(AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration::NUMERIC END) / 60, 1) as avg_duration_minutes
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '30 days';

-- 4. Testar função atual diretamente
SELECT 
    '=== FUNÇÃO ATUAL RESULTADO ===' as debug_step;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    ROUND(avg_duration / 60, 1) as avg_minutes
FROM public.get_sdr_metrics(30)
WHERE sdr_name IN ('Mariana Costa', 'Camila Ataliba', 'Andressa Habinoski')
ORDER BY total_calls DESC;

-- 5. Função de teste COM DURAÇÃO FIXA para verificar cache
DROP FUNCTION IF EXISTS public.get_sdr_metrics_cache_test CASCADE;

CREATE OR REPLACE FUNCTION public.get_sdr_metrics_cache_test(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    sdr_id TEXT,
    sdr_name TEXT,
    total_calls BIGINT,
    answered_calls BIGINT,
    avg_duration NUMERIC,
    avg_score NUMERIC
)
LANGUAGE sql
AS $$
    WITH sdr_groups AS (
        SELECT 
            agent_id,
            CASE
                WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
                WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
                WHEN agent_id ILIKE '%andressa%' THEN 'Andressa Habinoski'
                ELSE 'Outros'
            END as sdr_name,
            status_voip,
            duration
        FROM calls 
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
        AND agent_id IS NOT NULL
        AND (agent_id ILIKE '%mariana%' OR agent_id ILIKE '%camila%' OR agent_id ILIKE '%andressa%')
    )
    SELECT 
        MIN(agent_id) as sdr_id,
        sdr_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        888.0 as avg_duration,  -- VALOR FIXO PARA TESTAR CACHE
        5.0 as avg_score
    FROM sdr_groups
    GROUP BY sdr_name
    ORDER BY total_calls DESC;
$$;

-- Testar função com duração fixa
SELECT 
    '=== TESTE CACHE COM DURAÇÃO 888 ===' as debug_step;

SELECT 
    sdr_name,
    total_calls,
    avg_duration,
    ROUND(avg_duration / 60, 1) as avg_minutes
FROM public.get_sdr_metrics_cache_test(30);

-- 6. Verificar chamadas específicas com duração
SELECT 
    '=== CHAMADAS ESPECÍFICAS COM DURAÇÃO ===' as debug_step;

SELECT 
    agent_id,
    status_voip,
    duration,
    ROUND(duration / 60.0, 1) as duration_minutes,
    created_at::date
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND status_voip = 'normal_clearing'
AND duration > 0
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY duration DESC
LIMIT 5;

SELECT 'DEBUG SIMPLES COMPLETO - SEM ERROS!' as status;
