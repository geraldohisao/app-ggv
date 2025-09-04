-- ===================================================================
-- DEBUG CALLS FILTERING - Por que as chamadas longas não aparecem
-- ===================================================================

-- 1. Top 10 chamadas mais longas na tabela calls (dados brutos)
SELECT 
    'DADOS BRUTOS - TOP 10' as source,
    id,
    deal_id,
    duration,
    status_voip,
    agent_id,
    created_at
FROM calls 
WHERE duration IS NOT NULL AND duration > 0
ORDER BY duration DESC
LIMIT 10;

-- 2. Top 10 da função get_calls_with_filters (o que o frontend recebe)
SELECT 
    'FUNÇÃO - TOP 10' as source,
    id,
    deal_id,
    duration,
    status_voip_friendly,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
ORDER BY duration DESC
LIMIT 10;

-- 3. Verificar se as chamadas longas estão sendo filtradas
SELECT 
    'CHAMADAS LONGAS NA FUNÇÃO' as info,
    COUNT(*) as total_na_funcao,
    COUNT(CASE WHEN duration > 600 THEN 1 END) as mais_10_minutos,
    COUNT(CASE WHEN duration > 300 THEN 1 END) as mais_5_minutos,
    MAX(duration) as duracao_maxima
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

-- 4. Verificar se as chamadas longas têm algum problema específico
SELECT 
    'ANÁLISE CHAMADAS LONGAS' as info,
    id,
    duration,
    status_voip,
    agent_id,
    deal_id,
    person,
    enterprise,
    created_at,
    -- Verificar se campos obrigatórios estão preenchidos
    CASE WHEN agent_id IS NULL OR TRIM(agent_id) = '' THEN 'SEM AGENT_ID' ELSE 'OK' END as agent_status,
    CASE WHEN deal_id IS NULL OR TRIM(deal_id) = '' THEN 'SEM DEAL_ID' ELSE 'OK' END as deal_status
FROM calls 
WHERE duration > 600
ORDER BY duration DESC
LIMIT 10;

-- 5. Verificar filtros específicos da função
-- Testar com parâmetros diferentes
SELECT 
    'TESTE SEM FILTROS' as teste,
    COUNT(*) as total,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0);

-- 6. Verificar se há problema com agent_id das chamadas longas
SELECT 
    'AGENT_ID DAS CHAMADAS LONGAS' as info,
    agent_id,
    COUNT(*) as quantidade,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration
FROM calls 
WHERE duration > 600
GROUP BY agent_id
ORDER BY max_duration DESC;

-- 7. Verificar datas das chamadas longas
SELECT 
    'DATAS DAS CHAMADAS LONGAS' as info,
    DATE(created_at) as data,
    COUNT(*) as quantidade,
    MAX(duration) as max_duration
FROM calls 
WHERE duration > 600
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- 8. Testar se uma chamada longa específica aparece na função
SELECT 
    'TESTE CHAMADA ESPECÍFICA' as info,
    calls.id as id_original,
    calls.duration as duration_original,
    funcao.id as id_na_funcao,
    funcao.duration as duration_na_funcao,
    CASE 
        WHEN funcao.id IS NULL THEN 'NÃO APARECE NA FUNÇÃO'
        ELSE 'APARECE NA FUNÇÃO'
    END as status
FROM (
    SELECT id, duration FROM calls WHERE duration > 1000 LIMIT 1
) calls
LEFT JOIN (
    SELECT id, duration FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0)
) funcao ON calls.id = funcao.id;
