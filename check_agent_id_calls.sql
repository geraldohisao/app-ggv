-- Verificar agent_id das chamadas longas
SELECT 
    id,
    deal_id,
    duration,
    agent_id,
    CASE 
        WHEN agent_id IS NULL THEN 'NULL'
        WHEN TRIM(agent_id) = '' THEN 'VAZIO'
        ELSE 'PREENCHIDO'
    END as agent_status
FROM calls 
WHERE duration > 600
ORDER BY duration DESC
LIMIT 10;
