-- ===================================================================
-- TESTAR CHAMADAS ESPECÍFICAS NA FUNÇÃO
-- ===================================================================

-- 1. Verificar se essas chamadas específicas aparecem na função
SELECT 
    'TESTE CHAMADAS ESPECÍFICAS' as info,
    id,
    deal_id,
    duration,
    sdr_name,
    company_name,
    person_name
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0)
WHERE id IN (
    'bfa47fe2-323f-45db-a8bc-b55f8fd90753',
    '6b9162a8-0a9c-43f1-9990-57b15e7fa2a5',
    'ada3af12-e559-4e93-9ed0-7c31de94adb6',
    'b1416050-87f4-492f-8a1d-096b66ec241a',
    '51a7bb1b-7c41-4a1f-a1c2-8eb4b6724de0'
);

-- 2. Verificar agent_id dessas chamadas longas
SELECT 
    'AGENT_ID DAS CHAMADAS LONGAS' as info,
    id,
    agent_id,
    duration
FROM calls 
WHERE id IN (
    'bfa47fe2-323f-45db-a8bc-b55f8fd90753',
    '6b9162a8-0a9c-43f1-9990-57b15e7fa2a5',
    'ada3af12-e559-4e93-9ed0-7c31de94adb6',
    'b1416050-87f4-492f-8a1d-096b66ec241a',
    '51a7bb1b-7c41-4a1f-a1c2-8eb4b6724de0'
);

-- 3. Testar função com diferentes limites
SELECT 
    'TESTE LIMITE 50' as teste,
    COUNT(*) as total,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 50, 0);

SELECT 
    'TESTE LIMITE 500' as teste,
    COUNT(*) as total,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 500, 0);

SELECT 
    'TESTE LIMITE 2000' as teste,
    COUNT(*) as total,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0);

-- 4. Ver top 10 da função ordenado por duração
SELECT 
    'TOP 10 DA FUNÇÃO' as info,
    id,
    deal_id,
    duration,
    sdr_name
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
ORDER BY duration DESC
LIMIT 10;
