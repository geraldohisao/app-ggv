-- ===================================================================
-- DROP EXISTING FUNCTIONS - Remover funções existentes antes de recriar
-- ===================================================================

-- 1. Drop todas as funções que podem ter conflito
DROP FUNCTION IF EXISTS get_all_etapas_with_indefinida() CASCADE;
DROP FUNCTION IF EXISTS edit_call_etapa(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_real_call_types() CASCADE;
DROP FUNCTION IF EXISTS format_etapa_name(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_by_call_type_with_indefinida(TEXT) CASCADE;

-- 2. Drop com diferentes assinaturas que podem existir
DROP FUNCTION IF EXISTS get_real_call_types CASCADE;
DROP FUNCTION IF EXISTS format_etapa_name CASCADE;
DROP FUNCTION IF EXISTS edit_call_etapa CASCADE;
DROP FUNCTION IF EXISTS get_all_etapas_with_indefinida CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_by_call_type_with_indefinida CASCADE;

-- 3. Drop funções relacionadas que podem ter conflito
DROP FUNCTION IF EXISTS get_etapas_formatadas() CASCADE;
DROP FUNCTION IF EXISTS get_available_call_types() CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_by_call_type(TEXT) CASCADE;

-- 4. Verificar se ainda existem funções relacionadas
SELECT 
    'Funções relacionadas restantes:' as info,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%etapa%' 
   OR proname LIKE '%call_type%'
   OR proname LIKE '%scorecard%'
ORDER BY proname;

-- 5. Drop forçado usando loop para garantir limpeza
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop funções de etapa
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname IN (
            'get_all_etapas_with_indefinida',
            'edit_call_etapa',
            'get_real_call_types',
            'format_etapa_name',
            'get_scorecard_by_call_type_with_indefinida',
            'get_etapas_formatadas',
            'get_available_call_types',
            'get_scorecard_by_call_type'
        )
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s(%s) CASCADE', 
                      func_record.proname, 
                      func_record.args);
        RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.args;
    END LOOP;
END $$;

-- 6. Verificar limpeza final
SELECT 
    'Verificação final - funções restantes:' as info,
    COUNT(*) as quantidade
FROM pg_proc 
WHERE proname IN (
    'get_all_etapas_with_indefinida',
    'edit_call_etapa',
    'get_real_call_types',
    'format_etapa_name',
    'get_scorecard_by_call_type_with_indefinida'
);

SELECT 'Funções existentes removidas! Execute agora o script 83.' as status;
