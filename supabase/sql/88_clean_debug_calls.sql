-- ===================================================================
-- CLEAN DEBUG CALLS - Debug completamente limpo
-- ===================================================================

-- 1. Verificar se a função existe
SELECT 'Verificando função get_calls_with_filters:' as info;
SELECT COUNT(*) as existe FROM pg_proc WHERE proname = 'get_calls_with_filters';

-- 2. Verificar dados na tabela calls
SELECT 'Verificando dados na tabela calls:' as info;
SELECT COUNT(*) as total_calls FROM calls;

-- 3. Mostrar exemplos de dados
SELECT 'Exemplos de dados da tabela calls:' as info;
SELECT id, enterprise, person, agent_id, status, created_at FROM calls ORDER BY created_at DESC LIMIT 3;

-- 4. Verificar usuário atual
SELECT 'Usuário atual:' as info;
SELECT current_user as usuario, current_database() as database;

-- 5. Testar acesso direto à tabela
SELECT 'Teste de acesso direto:' as teste;
SELECT COUNT(*) as accessible_rows FROM calls;

-- 6. Testar função get_calls_with_filters
SELECT 'Testando função get_calls_with_filters:' as teste;
SELECT id, company_name, person_name, sdr_name, status FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2, 0);

-- 7. Criar função de teste super básica
CREATE OR REPLACE FUNCTION public.debug_calls_test()
RETURNS TABLE (
    call_count BIGINT,
    first_enterprise TEXT,
    first_person TEXT,
    first_agent TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as call_count,
        (SELECT enterprise FROM calls WHERE enterprise IS NOT NULL ORDER BY created_at DESC LIMIT 1) as first_enterprise,
        (SELECT person FROM calls WHERE person IS NOT NULL ORDER BY created_at DESC LIMIT 1) as first_person,
        (SELECT agent_id FROM calls WHERE agent_id IS NOT NULL ORDER BY created_at DESC LIMIT 1) as first_agent
    FROM calls;
$$;

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION public.debug_calls_test TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_calls_test TO anon;
GRANT EXECUTE ON FUNCTION public.debug_calls_test TO service_role;

-- 9. Testar função de debug
SELECT 'Testando função de debug:' as teste;
SELECT * FROM public.debug_calls_test();

-- 10. Verificar se RLS está ativo (sem forcerowsecurity)
SELECT 'Verificando RLS:' as info;
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'calls';

-- 11. Testar transformação de dados como na função principal
SELECT 'Teste de transformação de dados:' as teste;
SELECT 
    id,
    COALESCE(NULLIF(TRIM(enterprise), ''), 'Empresa Teste') as company_name,
    COALESCE(NULLIF(TRIM(person), ''), 'Pessoa Teste') as person_name,
    INITCAP(REPLACE(SPLIT_PART(agent_id, '@', 1), '.', ' ')) as sdr_name,
    status,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 2;

SELECT 'Debug limpo concluído!' as status;
