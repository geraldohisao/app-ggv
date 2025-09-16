-- VERIFICAR ESTRUTURA DOS DADOS NA TABELA CALLS

-- 1. Ver algumas chamadas e seus campos insights
SELECT 
    id,
    deal_id,
    agent_id,
    insights,
    created_at
FROM calls 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Ver quais chaves existem no campo insights
SELECT DISTINCT 
    jsonb_object_keys(insights) as insight_keys
FROM calls 
WHERE insights IS NOT NULL
ORDER BY insight_keys;

-- 3. Ver estrutura específica de algumas chamadas
SELECT 
    id,
    insights->>'company' as company_from_insights,
    insights->>'enterprise' as enterprise_from_insights,
    insights->>'person' as person_from_insights,
    insights->>'person_name' as person_name_from_insights,
    deal_id,
    agent_id
FROM calls 
WHERE insights IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

