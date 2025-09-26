-- 🧪 TESTE: Verificar se a correção do erro created_at funciona
-- Execute este script para testar as funções corrigidas

-- 1. Verificar se as funções foram criadas sem erro
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_scorecard_smart', 'debug_scorecard_selection', 'check_scorecard_conflicts')
AND routine_schema = 'public'
ORDER BY routine_name;

-- 2. Testar função get_scorecard_smart
SELECT 'Testando get_scorecard_smart:' as test_info;

SELECT 
    name,
    match_score,
    specificity_score
FROM get_scorecard_smart('consultoria', 'Apresentação de Proposta', 'inbound');

-- 3. Testar função debug_scorecard_selection
SELECT 'Testando debug_scorecard_selection:' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

-- 4. Testar função check_scorecard_conflicts
SELECT 'Testando check_scorecard_conflicts:' as test_info;

SELECT * FROM check_scorecard_conflicts();

-- 5. Verificar scorecards existentes
SELECT 'Scorecards existentes:' as info;

SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 6. Teste completo com diferentes cenários
SELECT 'Teste 1: Consultoria + Apresentação de Proposta' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

SELECT 'Teste 2: Consultoria + Qualificação' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');

SELECT 'Teste 3: Vendas + Apresentação de Proposta' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    ranking_position
FROM debug_scorecard_selection('vendas', 'Apresentação de Proposta', 'inbound');

-- 7. Verificar se não há mais erros
SELECT 'Todas as funções executaram sem erro!' as final_status;
