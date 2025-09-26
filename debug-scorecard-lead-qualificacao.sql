-- 🔍 DEBUG: Scorecard para "Lead (Qualificação)"
-- Este script investiga por que não está encontrando scorecard para Lead (Qualificação)

-- 1. Verificar todos os scorecards ativos
SELECT '1. Todos os scorecards ativos:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
ORDER BY name;

-- 2. Verificar scorecards que contêm "Lead" ou "Qualificação"
SELECT '2. Scorecards com "Lead" ou "Qualificação":' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
AND (
    name ILIKE '%lead%' 
    OR name ILIKE '%qualificação%'
    OR 'Lead (Qualificação)' = ANY(target_call_types)
    OR 'Lead' = ANY(target_call_types)
    OR 'Qualificação' = ANY(target_call_types)
)
ORDER BY name;

-- 3. Testar seleção inteligente para "Lead (Qualificação)"
SELECT '3. Teste de seleção para "Lead (Qualificação)":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Lead (Qualificação)', 'N/A', 'N/A');

-- 4. Verificar se há scorecards genéricos (sem target_call_types específicos)
SELECT '4. Scorecards genéricos (sem target_call_types específicos):' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
AND (
    target_call_types IS NULL 
    OR array_length(target_call_types, 1) = 0
    OR target_call_types = '{}'
)
ORDER BY name;

-- 5. Verificar scorecards que podem ser usados como fallback
SELECT '5. Scorecards que podem ser usados como fallback:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
AND (
    target_call_types IS NULL 
    OR array_length(target_call_types, 1) = 0
    OR target_call_types = '{}'
    OR 'Ligação' = ANY(target_call_types)
    OR 'Consultoria' = ANY(target_call_types)
)
ORDER BY name;
