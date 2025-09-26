-- 🔧 CORREÇÃO: Adicionar "Lead (Qualificação)" ao Scorecard
-- Este script adiciona "Lead (Qualificação)" aos target_call_types do scorecard

-- 1. Verificar scorecard atual
SELECT '1. Scorecard atual:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
AND 'Qualificação' = ANY(target_call_types)
LIMIT 1;

-- 2. Adicionar "Lead (Qualificação)" ao scorecard
UPDATE scorecards
SET 
    target_call_types = array_append(target_call_types, 'Lead (Qualificação)'),
    updated_at = NOW()
WHERE active = true
AND 'Qualificação' = ANY(target_call_types)
AND NOT ('Lead (Qualificação)' = ANY(target_call_types)); -- Evitar duplicatas

-- 3. Verificar scorecard após atualização
SELECT '2. Scorecard após atualização:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
AND 'Qualificação' = ANY(target_call_types)
LIMIT 1;

-- 4. Testar seleção para "Lead (Qualificação)"
SELECT '3. Teste de seleção para "Lead (Qualificação)":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Lead (Qualificação)', 'N/A', 'N/A');

-- 5. Verificar se a ligação da Hiara agora encontra scorecard
SELECT '4. Teste com dados da ligação da Hiara:' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Lead (Qualificação)', 'N/A', 'N/A');
