-- TESTE COMPLETO DO FILTRO DE DURAÇÃO
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar estrutura da tabela calls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calls' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se existem dados na tabela
SELECT COUNT(*) as total_calls FROM calls;

-- 3. Verificar campo duration especificamente
SELECT 
    COUNT(*) as total_with_duration,
    COUNT(CASE WHEN duration IS NULL THEN 1 END) as null_durations,
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration,
    COUNT(CASE WHEN duration >= 60 THEN 1 END) as calls_60_plus,
    COUNT(CASE WHEN duration >= 100 THEN 1 END) as calls_100_plus,
    COUNT(CASE WHEN duration >= 200 THEN 1 END) as calls_200_plus
FROM calls;

-- 4. Verificar tipos de dados no campo duration
SELECT 
    duration,
    pg_typeof(duration) as data_type,
    COUNT(*) as count
FROM calls 
WHERE duration IS NOT NULL
GROUP BY duration, pg_typeof(duration)
ORDER BY duration DESC
LIMIT 20;

-- 5. Testar filtro direto - duration >= 100
SELECT 
    id,
    duration,
    created_at,
    agent_id
FROM calls 
WHERE duration >= 100
ORDER BY duration DESC
LIMIT 10;

-- 6. Testar filtro com diferentes operadores
SELECT 
    'gte_100' as test_type,
    COUNT(*) as count
FROM calls 
WHERE duration >= 100

UNION ALL

SELECT 
    'gt_99' as test_type,
    COUNT(*) as count
FROM calls 
WHERE duration > 99

UNION ALL

SELECT 
    'eq_100' as test_type,
    COUNT(*) as count
FROM calls 
WHERE duration = 100;

-- 7. Verificar se há problema com índices
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'calls' AND schemaname = 'public';

-- 8. Testar query exata que o Supabase deveria executar
-- (Simulando: .from('calls').select('*').gte('duration', 100).range(0, 49).order('duration', false))
SELECT *
FROM calls 
WHERE duration >= 100
ORDER BY duration DESC
LIMIT 50 OFFSET 0;

-- 9. Verificar políticas RLS na tabela calls
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'calls' AND schemaname = 'public';

-- 10. Verificar se há triggers ou funções que podem interferir
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'calls' AND event_object_schema = 'public';
