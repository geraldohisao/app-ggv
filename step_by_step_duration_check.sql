-- EXECUTAR UMA QUERY POR VEZ PARA VER TODOS OS RESULTADOS

-- QUERY 1: Ver as 20 chamadas com maior duração
SELECT 
    id,
    duration,
    status_voip,
    created_at,
    agent_id,
    CASE 
        WHEN duration >= 60 THEN FLOOR(duration/60) || 'm ' || (duration%60) || 's'
        ELSE duration || 's'
    END as duration_readable
FROM calls 
WHERE duration IS NOT NULL AND duration > 0
ORDER BY duration DESC
LIMIT 20;

