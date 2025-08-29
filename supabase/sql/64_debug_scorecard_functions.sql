-- ===================================================================
-- DEBUG SCORECARD FUNCTIONS - Verificar se as funções existem
-- ===================================================================

-- 1. Verificar se as funções existem
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE '%scorecard%'
ORDER BY routine_name;

-- 2. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('scorecards', 'scorecard_criteria', 'scorecard_call_type_mapping');

-- 3. Testar a função get_scorecards_with_call_types
SELECT 'Testando get_scorecards_with_call_types...' as status;

-- Tentar executar a função
DO $$
BEGIN
    PERFORM get_scorecards_with_call_types();
    RAISE NOTICE 'Função get_scorecards_with_call_types existe e funciona';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função get_scorecards_with_call_types: %', SQLERRM;
END;
$$;

-- 4. Verificar dados nas tabelas
SELECT 'Dados em scorecards:' as info, COUNT(*) as count FROM scorecards;
SELECT 'Dados em scorecard_criteria:' as info, COUNT(*) as count FROM scorecard_criteria;
SELECT 'Dados em scorecard_call_type_mapping:' as info, COUNT(*) as count FROM scorecard_call_type_mapping;
