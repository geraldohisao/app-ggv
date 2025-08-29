-- ===================================================================
-- DROP GET_CALLS FUNCTIONS - Remover todas as versões da função
-- ===================================================================

-- 1. Listar todas as versões da função get_calls_with_filters
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pronargs as num_args
FROM pg_proc 
WHERE proname LIKE '%get_calls%'
ORDER BY proname, pronargs;

-- 2. Drop todas as possíveis versões da função get_calls_with_filters
DROP FUNCTION IF EXISTS get_calls_with_filters() CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) CASCADE;

-- 3. Drop com diferentes tipos de parâmetros que podem existir
DROP FUNCTION IF EXISTS get_calls_with_filters(p_sdr TEXT, p_status TEXT, p_type TEXT, p_start_date TEXT, p_end_date TEXT, p_limit INTEGER, p_offset INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(sdr_filter TEXT, status_filter TEXT, type_filter TEXT, start_date TEXT, end_date TEXT, limit_count INTEGER, offset_count INTEGER) CASCADE;

-- 4. Drop versões que podem ter nomes de parâmetros diferentes
DROP FUNCTION IF EXISTS get_calls_with_filters(sdr TEXT, status TEXT, type TEXT, start_date TEXT, end_date TEXT, limit_val INTEGER, offset_val INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_calls_with_filters(sdr_email TEXT, call_status TEXT, call_type TEXT, date_start TEXT, date_end TEXT, row_limit INTEGER, row_offset INTEGER) CASCADE;

-- 5. Drop função genérica sem especificar parâmetros (força remoção)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'get_calls_with_filters'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s(%s) CASCADE', 
                      func_record.proname, 
                      func_record.args);
        RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.args;
    END LOOP;
END $$;

-- 6. Verificar se todas as versões foram removidas
SELECT 
    'Funções restantes após limpeza:' as info,
    COUNT(*) as quantidade
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 7. Listar outras funções relacionadas que podem ter conflito
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%calls%' AND proname LIKE '%filter%'
ORDER BY proname;

SELECT 'Todas as versões de get_calls_with_filters removidas! Execute agora o script 79.' as status;
