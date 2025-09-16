-- INVESTIGAR TODAS AS DURAÇÕES NO BANCO

-- 1. Ver TODAS as durações ordenadas (maiores primeiro) - SEM LIMITE
SELECT 
    id,
    duration,
    status_voip,
    created_at,
    agent_id,
    -- Converter para minutos para facilitar leitura
    CASE 
        WHEN duration >= 60 THEN FLOOR(duration/60) || 'm ' || (duration%60) || 's'
        ELSE duration || 's'
    END as duration_readable
FROM calls 
WHERE duration IS NOT NULL
ORDER BY duration DESC
LIMIT 50;  -- Top 50 para não sobrecarregar

-- 2. Estatísticas completas por faixas
SELECT 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration BETWEEN 1 AND 30 THEN '1-30 segundos'
        WHEN duration BETWEEN 31 AND 60 THEN '31-60 segundos'
        WHEN duration BETWEEN 61 AND 120 THEN '61-120 segundos (1-2 min)'
        WHEN duration BETWEEN 121 AND 300 THEN '121-300 segundos (2-5 min)'
        WHEN duration BETWEEN 301 AND 600 THEN '301-600 segundos (5-10 min)'
        WHEN duration BETWEEN 601 AND 1200 THEN '601-1200 segundos (10-20 min)'
        WHEN duration > 1200 THEN '1200+ segundos (20+ min)'
    END as faixa_duracao,
    COUNT(*) as quantidade,
    MIN(duration) as min_na_faixa,
    MAX(duration) as max_na_faixa
FROM calls
GROUP BY 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration BETWEEN 1 AND 30 THEN '1-30 segundos'
        WHEN duration BETWEEN 31 AND 60 THEN '31-60 segundos'
        WHEN duration BETWEEN 61 AND 120 THEN '61-120 segundos (1-2 min)'
        WHEN duration BETWEEN 121 AND 300 THEN '121-300 segundos (2-5 min)'
        WHEN duration BETWEEN 301 AND 600 THEN '301-600 segundos (5-10 min)'
        WHEN duration BETWEEN 601 AND 1200 THEN '601-1200 segundos (10-20 min)'
        WHEN duration > 1200 THEN '1200+ segundos (20+ min)'
    END
ORDER BY MIN(COALESCE(duration, 0));

-- 3. Estatísticas gerais COMPLETAS
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration IS NOT NULL THEN 1 END) as calls_with_duration,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as calls_with_positive_duration,
    MIN(duration) as absolute_min,
    MAX(duration) as absolute_max,
    AVG(duration) as avg_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration
FROM calls;

-- 4. Verificar se há problema com filtros ou WHERE clauses anteriores
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

-- 5. Ver algumas chamadas específicas com duração alta
SELECT 
    'CHAMADAS COM MAIOR DURAÇÃO' as titulo;

SELECT 
    id,
    duration,
    status_voip,
    agent_id,
    created_at,
    FLOOR(duration/60) || ':' || LPAD((duration%60)::text, 2, '0') as duration_mm_ss
FROM calls 
WHERE duration > 60
ORDER BY duration DESC
LIMIT 20;

