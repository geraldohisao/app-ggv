-- 🔍 DEBUG: Verificar se pipeline/etapa está sendo passado corretamente
-- Execute este script para diagnosticar o problema de seleção por etapa

-- 1. Verificar se a função get_call_detail retorna pipeline
SELECT 'Verificando se get_call_detail retorna pipeline:' as info;

-- Testar com uma chamada real
SELECT 
    id,
    call_type,
    insights->>'pipeline' as pipeline_from_insights,
    insights->>'deal_stage' as deal_stage_from_insights,
    insights->>'stage' as stage_from_insights
FROM calls 
WHERE transcription IS NOT NULL 
AND transcription != ''
LIMIT 3;

-- 2. Verificar scorecards e suas configurações de pipeline
SELECT 'Scorecards e suas configurações:' as info;

SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 3. Testar seleção com pipeline específico
SELECT 'Teste 1: Consultoria + Apresentação de Proposta (deve priorizar scorecard específico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

-- 4. Testar seleção com pipeline genérico
SELECT 'Teste 2: Consultoria + Qualificação (deve usar scorecard genérico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');

-- 5. Verificar se há scorecards configurados para "Apresentação de Proposta"
SELECT 'Scorecards configurados para "Apresentação de Proposta":' as info;

SELECT 
    name,
    target_pipelines,
    active
FROM scorecards 
WHERE 'Apresentação de Proposta' = ANY(target_pipelines)
OR target_pipelines IS NULL;

-- 6. Testar com pipeline que não existe (deve usar scorecard genérico)
SELECT 'Teste 3: Consultoria + Pipeline inexistente (deve usar genérico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Pipeline_Inexistente', 'inbound');

-- 7. Verificar conflitos
SELECT 'Conflitos detectados:' as info;
SELECT * FROM check_scorecard_conflicts();
