-- INVESTIGAR A COLUNA DURATION_FORMATTED

-- 1. Ver valores únicos na coluna duration_formatted
SELECT DISTINCT duration_formatted 
FROM calls 
WHERE duration_formatted IS NOT NULL 
ORDER BY duration_formatted DESC
LIMIT 50;

-- 2. Comparar duration vs duration_formatted
SELECT 
    id,
    duration,
    duration_formatted,
    status_voip,
    created_at
FROM calls 
WHERE duration_formatted IS NOT NULL
ORDER BY 
    CASE 
        WHEN duration_formatted ~ '^[0-9]+:[0-9]+:[0-9]+$' THEN 
            CAST(SPLIT_PART(duration_formatted, ':', 1) AS INTEGER) * 3600 + 
            CAST(SPLIT_PART(duration_formatted, ':', 2) AS INTEGER) * 60 + 
            CAST(SPLIT_PART(duration_formatted, ':', 3) AS INTEGER)
        ELSE 0
    END DESC
LIMIT 20;

-- 3. Contar registros com duration_formatted
SELECT 
    'Total calls' as categoria,
    COUNT(*) as quantidade
FROM calls
UNION ALL
SELECT 
    'Com duration_formatted' as categoria,
    COUNT(*) as quantidade
FROM calls 
WHERE duration_formatted IS NOT NULL
UNION ALL
SELECT 
    'duration_formatted > 00:01:00' as categoria,
    COUNT(*) as quantidade
FROM calls 
WHERE duration_formatted > '00:01:00';

-- 4. Ver chamadas com duration_formatted longa
SELECT 
    id,
    duration,
    duration_formatted,
    status_voip,
    agent_id,
    created_at
FROM calls 
WHERE duration_formatted > '00:01:00'
ORDER BY duration_formatted DESC
LIMIT 10;

