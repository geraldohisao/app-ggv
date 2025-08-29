-- ===================================================================
-- DROP CRITERIA FUNCTIONS FIRST - Remover funções conflitantes
-- ===================================================================

-- 1. Drop todas as funções relacionadas a critérios que podem ter conflito
DROP FUNCTION IF EXISTS edit_scorecard_criterion(UUID, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS delete_scorecard_criterion(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_criterion_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_scorecard_criterion(UUID, TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS add_scorecard_criterion(UUID, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reorder_scorecard_criteria(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS remove_scorecard_criterion(UUID) CASCADE;

-- 2. Drop funções com diferentes assinaturas que podem existir
DROP FUNCTION IF EXISTS edit_scorecard_criterion CASCADE;
DROP FUNCTION IF EXISTS delete_scorecard_criterion CASCADE;
DROP FUNCTION IF EXISTS get_criterion_details CASCADE;
DROP FUNCTION IF EXISTS add_scorecard_criterion CASCADE;
DROP FUNCTION IF EXISTS reorder_scorecard_criteria CASCADE;
DROP FUNCTION IF EXISTS remove_scorecard_criterion CASCADE;

-- 3. Verificar se ainda existem funções relacionadas
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%criterion%' OR proname LIKE '%criteria%'
ORDER BY proname;

SELECT 'Funções de critérios removidas com sucesso! Execute agora o script 72.' as status;
