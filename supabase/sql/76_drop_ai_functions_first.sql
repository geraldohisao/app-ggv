-- ===================================================================
-- DROP AI FUNCTIONS FIRST - Remover funções de IA conflitantes
-- ===================================================================

-- 1. Drop todas as funções relacionadas à análise IA que podem ter conflito
DROP FUNCTION IF EXISTS perform_full_ai_analysis(UUID) CASCADE;
DROP FUNCTION IF EXISTS analyze_call_with_ai_scoring(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_criterion_score(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_by_call_type_with_indefinida(TEXT) CASCADE;

-- 2. Drop funções com diferentes assinaturas que podem existir
DROP FUNCTION IF EXISTS perform_full_ai_analysis CASCADE;
DROP FUNCTION IF EXISTS analyze_call_with_ai_scoring CASCADE;
DROP FUNCTION IF EXISTS calculate_criterion_score CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_by_call_type_with_indefinida CASCADE;

-- 3. Verificar se ainda existem funções relacionadas à IA
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%ai%' OR proname LIKE '%analysis%' OR proname LIKE '%scoring%'
ORDER BY proname;

SELECT 'Funções de IA removidas com sucesso! Execute agora o script 74.' as status;
