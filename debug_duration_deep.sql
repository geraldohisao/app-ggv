-- ===================================================================
-- DEBUG PROFUNDO - Investigar por que duração ainda não funciona
-- ===================================================================

-- 1. Verificar estrutura da tabela calls
SELECT 
    '=== ESTRUTURA DA TABELA CALLS ===' as debug_step;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN ('duration', 'duration_formated', 'status_voip', 'agent_id')
ORDER BY column_name;

-- 2. Verificar dados brutos específicos
SELECT 
    '=== DADOS BRUTOS MARIANA ===' as debug_step;

SELECT 
    id,
    agent_id,
    status_voip,
    duration,
    duration_formated,
    created_at::date,
    CASE 
        WHEN duration IS NOT NULL AND duration > 0 THEN duration
        WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
            EXTRACT(EPOCH FROM duration_formated::interval)::INTEGER
        ELSE 0
    END as calculated_duration
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há chamadas atendidas COM duração
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

-- 4. Testar função atual diretamente
SELECT 
    '=== FUNÇÃO ATUAL RESULTADO ===' as debug_step;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    avg_score
FROM public.get_sdr_metrics(30)
WHERE sdr_name IN ('Mariana Costa', 'Camila Ataliba', 'Andressa Habinoski')
ORDER BY total_calls DESC;

-- 5. Teste manual SIMPLES
SELECT 
    '=== TESTE MANUAL SIMPLES ===' as debug_step;

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

-- 6. Verificar se o problema é no frontend (cache)
SELECT 
    '=== TESTE CACHE FRONTEND ===' as debug_step;

-- Função temporária para testar
DROP FUNCTION IF EXISTS public.get_sdr_metrics_test_cache CASCADE;

CREATE OR REPLACE FUNCTION public.get_sdr_metrics_test_cache(p_days INTEGER DEFAULT 30)
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
    SELECT 
        MIN(agent_id) as sdr_id,
        CASE
            WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
            WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
            ELSE 'Outros'
        END as sdr_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        999.0 as avg_duration,  -- VALOR FIXO PARA TESTAR CACHE
        AVG(CASE WHEN scorecard IS NOT NULL THEN 5.0 ELSE NULL END) as avg_score
    FROM calls 
    WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
    AND agent_id IS NOT NULL
    AND (agent_id ILIKE '%mariana%' OR agent_id ILIKE '%camila%')
    GROUP BY sdr_name
    ORDER BY total_calls DESC;
$$;

SELECT 
    'TESTE COM DURAÇÃO FIXA 999' as teste,
    sdr_name,
    avg_duration
FROM public.get_sdr_metrics_test_cache(30);

SELECT 'DEBUG COMPLETO - VERIFICAR TODOS OS RESULTADOS' as status;
