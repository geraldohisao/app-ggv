-- INVESTIGAÇÃO CORRIGIDA - SEM COLUNA HASRLS

-- 1. Verificar RLS status (corrigido)
SELECT 
    schemaname,
    tablename,
    rowsecurity
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

-- 3. Verificar role atual
SELECT 
    current_user as usuario_atual,
    session_user as usuario_sessao;

-- 4. Testar contagens básicas
SELECT COUNT(*) as total_calls_sem_filtro FROM calls;

-- 5. Testar diferentes condições de duração
SELECT 'duration IS NOT NULL' as condicao, COUNT(*) as quantidade FROM calls WHERE duration IS NOT NULL
UNION ALL
SELECT 'duration > 0' as condicao, COUNT(*) as quantidade FROM calls WHERE duration > 0
UNION ALL
SELECT 'duration >= 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration >= 60
UNION ALL
SELECT 'duration = 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration = 60
UNION ALL
SELECT 'duration > 60' as condicao, COUNT(*) as quantidade FROM calls WHERE duration > 60;

