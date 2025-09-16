-- TESTAR SE EXISTEM CHAMADAS COM DURAÇÃO >= 100 SEGUNDOS

-- 1. Ver todas as durações ordenadas (maiores primeiro)
SELECT 
    id,
    duration,
    status_voip,
    created_at::date as data,
    agent_id
FROM calls 
WHERE duration IS NOT NULL AND duration > 0
ORDER BY duration DESC
LIMIT 20;

-- 2. Contar chamadas por faixas de duração
SELECT 
    'Total chamadas' as categoria,
    COUNT(*) as quantidade
FROM calls
UNION ALL
SELECT 
    'Duração > 0' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration > 0
UNION ALL
SELECT 
    'Duração >= 60' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 60
UNION ALL
SELECT 
    'Duração >= 100' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 100
UNION ALL
SELECT 
    'Duração >= 120' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 120;

-- 3. Ver estatísticas de duração
SELECT 
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration,
    COUNT(*) as total_with_duration
FROM calls 
WHERE duration IS NOT NULL AND duration > 0;

