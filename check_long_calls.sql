-- VERIFICAR CHAMADAS LONGAS ESPECIFICAMENTE

-- Ver estatísticas completas
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration IS NOT NULL THEN 1 END) as calls_with_duration,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as calls_with_positive_duration,
    MIN(duration) as absolute_min,
    MAX(duration) as absolute_max,
    AVG(duration) as avg_duration
FROM calls;

-- Ver contadores por faixas
SELECT 
    'Chamadas >= 60s' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 60
UNION ALL
SELECT 
    'Chamadas >= 100s' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 100
UNION ALL
SELECT 
    'Chamadas >= 200s' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 200
UNION ALL
SELECT 
    'Chamadas >= 300s' as categoria,
    COUNT(*) as quantidade
FROM calls WHERE duration >= 300;

