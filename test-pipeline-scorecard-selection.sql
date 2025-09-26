-- 🧪 TESTE: Verificar seleção inteligente de scorecard por pipeline
-- Execute este script para testar se a correção está funcionando

-- 1. Verificar se as funções foram criadas
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_call_detail', 'get_scorecard_smart', 'debug_scorecard_selection')
AND routine_schema = 'public';

-- 2. Testar função get_call_detail com pipeline
SELECT 'Testando get_call_detail com pipeline:' as test_info;

-- Pegar uma chamada existente para teste
SELECT 
    id,
    call_type,
    insights->>'pipeline' as pipeline_from_insights,
    insights->>'deal_stage' as deal_stage_from_insights
FROM calls 
WHERE transcription IS NOT NULL 
AND transcription != ''
LIMIT 1;

-- 3. Testar seleção inteligente para diferentes etapas
SELECT 'Testando seleção para "Apresentação de Proposta":' as test_info;

SELECT 
    name,
    match_score,
    match_details,
    target_pipelines,
    target_call_types
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

SELECT 'Testando seleção para "Qualificação":' as test_info;

SELECT 
    name,
    match_score,
    match_details,
    target_pipelines,
    target_call_types
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');

SELECT 'Testando seleção para "Descoberta de Necessidades":' as test_info;

SELECT 
    name,
    match_score,
    match_details,
    target_pipelines,
    target_call_types
FROM debug_scorecard_selection('consultoria', 'Descoberta de Necessidades', 'inbound');

-- 4. Verificar scorecards configurados
SELECT 'Scorecards configurados:' as info;

SELECT 
    s.id,
    s.name,
    s.active,
    s.target_call_types,
    s.target_pipelines,
    s.target_cadences,
    COUNT(sc.id) as criteria_count
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.active, s.target_call_types, s.target_pipelines, s.target_cadences
ORDER BY s.name;

-- 5. Teste completo com chamada real
SELECT 'Teste completo com chamada real:' as test_info;

-- Pegar ID de uma chamada real
WITH test_call AS (
    SELECT id, call_type, insights
    FROM calls 
    WHERE transcription IS NOT NULL 
    AND transcription != ''
    LIMIT 1
)
SELECT 
    tc.id as call_id,
    tc.call_type,
    tc.insights->>'pipeline' as pipeline,
    tc.insights->>'deal_stage' as deal_stage,
    gs.name as selected_scorecard,
    gs.match_score,
    gs.match_details
FROM test_call tc
CROSS JOIN LATERAL (
    SELECT name, match_score, match_details
    FROM debug_scorecard_selection(
        tc.call_type, 
        COALESCE(tc.insights->>'pipeline', tc.insights->>'deal_stage'),
        'inbound'
    )
    LIMIT 1
) gs;
