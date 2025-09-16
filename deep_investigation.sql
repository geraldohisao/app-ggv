-- INVESTIGAÇÃO PROFUNDA - VERIFICAR SE HÁ LIMITAÇÕES

-- 1. Verificar RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'calls';

-- 2. Verificar políticas RLS ativas
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

-- 3. Verificar role atual e permissões
SELECT 
    current_user as usuario_atual,
    session_user as usuario_sessao,
    current_setting('role') as role_atual;

-- 4. Testar query SEM filtros para ver total real
SELECT COUNT(*) as total_calls_sem_filtro FROM calls;

-- 5. Testar query com diferentes condições
SELECT 'duration IS NOT NULL' as condicao, COUNT(*) as quantidade FROM calls WHERE duration IS NOT NULL
UNION ALL
SELECT 'duration > 0' as condicao, COUNT(*) as quantidade FROM calls WHERE duration > 0
UNION ALL
SELECT 'duration >= 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration >= 60
UNION ALL
SELECT 'duration = 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration = 60
UNION ALL
SELECT 'duration > 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration > 60;

-- 6. Ver se há outras tabelas calls ou views
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name ILIKE '%call%'
ORDER BY table_schema, table_name;

-- 7. Verificar se há triggers ou funções que podem estar afetando
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'calls';

-- 8. Tentar query com SECURITY DEFINER bypass (se possível)
SELECT 
    id,
    duration,
    created_at
FROM calls 
WHERE duration >= 60
ORDER BY duration DESC;

