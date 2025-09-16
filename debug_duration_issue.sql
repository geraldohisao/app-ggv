-- ===================================================================
-- DEBUG DURATION ISSUE - Investigar por que duração ainda mostra 0m
-- ===================================================================

-- 1. Verificar se a função foi atualizada corretamente
SELECT 
    '=== VERIFICANDO FUNÇÃO ATUAL ===' as debug_step;

-- Testar função diretamente
SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    ROUND(avg_duration / 60, 1) as avg_duration_minutes
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 5;

-- 2. Verificar dados brutos das chamadas
SELECT 
    '=== VERIFICANDO DADOS BRUTOS ===' as debug_step;

SELECT 
    agent_id,
    status_voip,
    duration,
    CASE WHEN status_voip = 'normal_clearing' THEN 'ATENDIDA' ELSE 'NÃO ATENDIDA' END as tipo,
    created_at
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se existem chamadas atendidas com duração > 0
SELECT 
    '=== VERIFICANDO CHAMADAS ATENDIDAS COM DURAÇÃO ===' as debug_step;

SELECT 
    COUNT(*) as total_atendidas,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as atendidas_com_duracao,
    AVG(CASE WHEN duration > 0 THEN duration END) as duracao_media_segundos,
    AVG(CASE WHEN duration > 0 THEN duration END) / 60 as duracao_media_minutos
FROM calls 
WHERE status_voip = 'normal_clearing'
AND created_at >= NOW() - INTERVAL '30 days';

-- 4. Verificar por SDR específico
SELECT 
    '=== VERIFICANDO MARIANA COSTA ESPECIFICAMENTE ===' as debug_step;

SELECT 
    agent_id,
    status_voip,
    duration,
    duration / 60.0 as duration_minutes
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND status_voip = 'normal_clearing'
AND duration > 0
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY duration DESC
LIMIT 5;

-- 5. Testar cálculo manual
SELECT 
    '=== TESTE MANUAL DE CÁLCULO ===' as debug_step;

WITH manual_calc AS (
    SELECT 
        CASE 
            WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
            WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
            ELSE 'Outros'
        END as sdr_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        AVG(CASE 
            WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration 
            ELSE NULL 
        END) as avg_duration_seconds
    FROM calls 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND agent_id IS NOT NULL
    AND (agent_id ILIKE '%mariana%' OR agent_id ILIKE '%camila%')
    GROUP BY sdr_name
)
SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration_seconds,
    ROUND(avg_duration_seconds / 60, 1) as avg_duration_minutes
FROM manual_calc;

SELECT 'DEBUG COMPLETO - Verificar resultados acima' as status;
