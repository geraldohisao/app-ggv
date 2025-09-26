-- 🔍 TESTAR: Seleção de scorecard para etapa "Ligação"
-- Script para verificar se o scorecard correto é selecionado

-- 1. Verificar scorecards disponíveis para "Ligação"
SELECT 'Scorecards disponíveis para Ligação:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines,
    s.active
FROM scorecards s
WHERE s.active = true
AND (
    s.target_call_types @> '["Ligação"]'::jsonb
    OR s.target_call_types @> '["ligação"]'::jsonb
    OR s.target_call_types @> '["Ligação - Consultoria"]'::jsonb
    OR s.target_call_types @> '["Ligação - Consultoria"]'::jsonb
);

-- 2. Testar seleção inteligente de scorecard
SELECT 'Testando seleção inteligente:' as info;
SELECT * FROM get_scorecard_smart(
    'Ligação',  -- call_type
    'GGV Inteligência em Vendas',  -- pipeline
    'Inbound - Consultoria (-100k/mês)'  -- cadence
);

-- 3. Verificar se há scorecard específico para "Ligação"
SELECT 'Scorecards com target_call_types contendo Ligação:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines
FROM scorecards s
WHERE s.active = true
AND (
    s.target_call_types::text ILIKE '%Ligação%'
    OR s.target_call_types::text ILIKE '%ligação%'
);
