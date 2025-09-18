-- CORRIGIR TODAS AS DATAS PARA DEZEMBRO/2024
-- Primeiro, trazer todas as chamadas de 2025 para 2024
UPDATE calls 
SET 
    created_at = created_at - INTERVAL '1 year',
    updated_at = CASE 
        WHEN updated_at IS NOT NULL 
        THEN updated_at - INTERVAL '1 year'
        ELSE NULL 
    END,
    processed_at = CASE 
        WHEN processed_at IS NOT NULL 
        THEN processed_at - INTERVAL '1 year'
        ELSE NULL 
    END
WHERE EXTRACT(YEAR FROM created_at) = 2025;

-- Agora, garantir que todas as chamadas estejam nas últimas 2 semanas
-- Vamos distribuir todas as 2230 chamadas entre 03/12/2024 e 17/12/2024
UPDATE calls
SET created_at = 
    TIMESTAMP '2024-12-03 08:00:00' + 
    (random() * INTERVAL '14 days') +
    (random() * INTERVAL '10 hours');

-- Atualizar updated_at e processed_at para ficar coerente
UPDATE calls
SET 
    updated_at = created_at + INTERVAL '1 hour',
    processed_at = created_at + INTERVAL '2 hours'
WHERE updated_at IS NOT NULL OR processed_at IS NOT NULL;

-- Verificar resultado final
SELECT 
    COUNT(*) as total_calls,
    TO_CHAR(MIN(created_at), 'DD/MM/YYYY HH24:MI') as primeira_call,
    TO_CHAR(MAX(created_at), 'DD/MM/YYYY HH24:MI') as ultima_call,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days') as ultimos_14_dias,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as ultimos_7_dias,
    TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') as agora
FROM calls;

