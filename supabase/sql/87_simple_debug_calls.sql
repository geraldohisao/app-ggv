-- ===================================================================
-- SIMPLE DEBUG CALLS - Debug simplificado para resolver problema
-- ===================================================================

-- 1. Verificar se a função existe
SELECT 
    'Função get_calls_with_filters:' as info,
    COUNT(*) as existe
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Verificar dados na tabela calls
SELECT 
    'Dados na tabela calls:' as info,
    COUNT(*) as total_calls
FROM calls;

-- 3. Mostrar exemplos de dados
SELECT 
    'Exemplos de dados:' as info;

SELECT 
    id,
    enterprise,
    person,
    agent_id,
    status,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 3;

-- 4. Testar função diretamente
SELECT 
    'Testando função get_calls_with_filters:' as teste;

SELECT 
    id,
    company_name,
    person_name,
    sdr_name,
    status
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 3, 0);

-- 5. Verificar RLS simples
SELECT 
    'RLS na tabela calls:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'calls';

-- 6. Verificar usuário atual
SELECT 
    'Usuário atual:' as info,
    current_user as usuario,
    current_database() as database;

-- 7. Criar função de teste super simples
CREATE OR REPLACE FUNCTION public.test_calls_basic()
RETURNS TABLE (
    total_calls BIGINT,
    sample_enterprise TEXT,
    sample_person TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as total_calls,
        (SELECT enterprise FROM calls WHERE enterprise IS NOT NULL LIMIT 1) as sample_enterprise,
        (SELECT person FROM calls WHERE person IS NOT NULL LIMIT 1) as sample_person
    FROM calls;
$$;

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION public.test_calls_basic TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_calls_basic TO anon;
GRANT EXECUTE ON FUNCTION public.test_calls_basic TO service_role;

-- 9. Testar função básica
SELECT 
    'Teste função básica:' as teste;

SELECT * FROM public.test_calls_basic();

-- 10. Verificar se há problema com a função principal
SELECT 
    'Verificando assinatura da função:' as info,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 11. Testar acesso direto com COALESCE
SELECT 
    'Teste com COALESCE:' as teste,
    id,
    COALESCE(NULLIF(TRIM(enterprise), ''), 'Empresa Teste') as company_name,
    COALESCE(NULLIF(TRIM(person), ''), 'Pessoa Teste') as person_name,
    status,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 2;

-- 12. Verificar se há problema de permissões na tabela
SELECT 
    'Testando SELECT direto:' as teste,
    COUNT(*) as accessible_rows
FROM calls;

SELECT 'Debug simplificado concluído!' as status;
