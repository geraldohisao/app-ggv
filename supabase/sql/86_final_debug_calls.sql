-- ===================================================================
-- FINAL DEBUG CALLS - Debug final para resolver problema de chamadas
-- ===================================================================

-- 1. Verificar se a função existe e funciona
SELECT 
    'Verificando função:' as info,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pronamespace::regnamespace as schema
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Testar a função diretamente com dados simples
SELECT 
    'Teste direto da função:' as teste;

SELECT 
    id,
    company_name,
    person_name,
    sdr_name,
    status,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 3, 0)
ORDER BY created_at DESC;

-- 3. Verificar se há dados na tabela calls
SELECT 
    'Dados na tabela calls:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN enterprise IS NOT NULL AND enterprise != '' THEN 1 END) as com_enterprise,
    COUNT(CASE WHEN person IS NOT NULL AND person != '' THEN 1 END) as com_person,
    MIN(created_at) as primeira_call,
    MAX(created_at) as ultima_call
FROM calls;

-- 4. Verificar exemplos de dados brutos
SELECT 
    'Exemplos de dados brutos:' as info;

SELECT 
    id,
    enterprise,
    person,
    agent_id,
    status,
    call_type,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar RLS (Row Level Security)
SELECT 
    'Verificando RLS:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'calls';

-- 6. Verificar políticas RLS
SELECT 
    'Políticas RLS:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'calls';

-- 7. Testar acesso direto à tabela calls
SELECT 
    'Teste acesso direto à tabela:' as teste,
    COUNT(*) as total_accessible
FROM calls;

-- 8. Verificar se o usuário atual tem permissões
SELECT 
    'Usuário atual:' as info,
    current_user as usuario,
    session_user as sessao,
    current_database() as database;

-- 9. Verificar permissões na função
SELECT 
    'Permissões da função:' as info,
    p.proname as function_name,
    p.proacl as permissions
FROM pg_proc p
WHERE p.proname = 'get_calls_with_filters';

-- 10. Criar uma versão simplificada da função para teste
CREATE OR REPLACE FUNCTION public.test_get_calls_simple()
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    person_name TEXT,
    sdr_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        COALESCE(NULLIF(TRIM(c.enterprise), ''), 'Empresa Teste') as company_name,
        COALESCE(NULLIF(TRIM(c.person), ''), 'Pessoa Teste') as person_name,
        INITCAP(REPLACE(SPLIT_PART(c.agent_id, '@', 1), '.', ' ')) as sdr_name,
        c.status,
        c.created_at
    FROM calls c
    ORDER BY c.created_at DESC
    LIMIT 5;
$$;

-- 11. Conceder permissões na função de teste
GRANT EXECUTE ON FUNCTION public.test_get_calls_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_get_calls_simple TO anon;
GRANT EXECUTE ON FUNCTION public.test_get_calls_simple TO service_role;

-- 12. Testar função simplificada
SELECT 
    'Teste função simplificada:' as teste;

SELECT * FROM public.test_get_calls_simple();

-- 13. Verificar se há problemas de encoding ou caracteres especiais
SELECT 
    'Verificando encoding:' as info,
    id,
    length(enterprise) as len_enterprise,
    length(person) as len_person,
    enterprise,
    person
FROM calls 
WHERE enterprise IS NOT NULL OR person IS NOT NULL
ORDER BY created_at DESC
LIMIT 3;

SELECT 'Debug final concluído!' as status;
