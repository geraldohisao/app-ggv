-- Query simples para verificar agent_id das chamadas longas
SELECT 
    id,
    duration,
    agent_id,
    CASE 
        WHEN agent_id IS NULL THEN 'NULL'
        WHEN TRIM(agent_id) = '' THEN 'VAZIO'  
        ELSE 'PREENCHIDO'
    END as status_agent
FROM calls 
WHERE duration > 600
ORDER BY duration DESC
LIMIT 5;
