-- ===================================================================
-- DEBUG SIMPLES - Por que chamadas longas não aparecem
-- ===================================================================

-- 1. Top 5 chamadas mais longas (dados brutos)
SELECT 
    id,
    deal_id,
    duration,
    agent_id,
    status_voip,
    created_at
FROM calls 
WHERE duration > 600
ORDER BY duration DESC
LIMIT 5;

-- 2. Contar chamadas longas na tabela
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration > 600 THEN 1 END) as calls_over_10min,
    MAX(duration) as max_duration
FROM calls;

-- 3. Verificar agent_id das chamadas longas
SELECT 
    agent_id,
    COUNT(*) as quantidade,
    MAX(duration) as max_duration
FROM calls 
WHERE duration > 600
GROUP BY agent_id;

-- 4. Testar função com limite alto
SELECT 
    COUNT(*) as total_na_funcao,
    MAX(duration) as max_duration_na_funcao
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0);

-- 5. Ver se uma call específica longa existe na função
SELECT 
    id,
    duration,
    sdr_name
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0)
WHERE duration > 600
ORDER BY duration DESC
LIMIT 5;
