-- ===================================================================
-- DEBUG CALLS ERRORS - Investigar erros no carregamento de chamadas
-- ===================================================================

-- 1. Verificar se a função get_calls_with_filters existe e funciona
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pronargs as num_args
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Testar a função diretamente
SELECT 
    'Teste direto da função' as teste,
    COUNT(*) as total_calls
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0);

-- 3. Verificar se há dados na tabela calls
SELECT 
    'Dados na tabela calls' as info,
    COUNT(*) as total_calls,
    MIN(created_at) as primeira_call,
    MAX(created_at) as ultima_call
FROM calls;

-- 4. Testar função com dados específicos
SELECT 
    id,
    company_name,
    person_name,
    sdr_name,
    status,
    created_at
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0)
ORDER BY created_at DESC;

-- 5. Verificar se a função get_all_etapas_with_indefinida existe
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_all_etapas_with_indefinida';

-- 6. Testar função de etapas
SELECT * FROM get_all_etapas_with_indefinida();

-- 7. Verificar permissões das funções
SELECT 
    p.proname as function_name,
    array_agg(DISTINCT a.rolname) as granted_to
FROM pg_proc p
LEFT JOIN pg_proc_acl pa ON p.oid = pa.oid
LEFT JOIN pg_authid a ON a.oid = ANY(pa.grantee)
WHERE p.proname IN ('get_calls_with_filters', 'get_all_etapas_with_indefinida')
GROUP BY p.proname;

-- 8. Verificar RLS (Row Level Security) na tabela calls
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'calls';

-- 9. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'calls';

-- 10. Teste de conexão básica
SELECT 
    'Conexão funcionando' as status,
    current_user as usuario_atual,
    current_database() as database_atual,
    NOW() as timestamp_atual;

SELECT 'Debug de erros de chamadas concluído!' as status;
