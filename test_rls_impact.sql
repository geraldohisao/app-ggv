-- TESTE PARA VERIFICAR SE O PROBLEMA É REALMENTE O RLS

-- 1. Testar query simples (deve funcionar)
SELECT COUNT(*) as total_calls FROM calls;

-- 2. Testar query com filtro de duração (pode falhar com RLS)
SELECT COUNT(*) as calls_100_plus FROM calls WHERE duration >= 100;

-- 3. Testar com diferentes filtros
SELECT COUNT(*) as calls_60_plus FROM calls WHERE duration >= 60;
SELECT COUNT(*) as calls_30_plus FROM calls WHERE duration >= 30;

-- 4. Verificar se há dados de duração
SELECT 
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration,
    COUNT(CASE WHEN duration >= 60 THEN 1 END) as count_60_plus,
    COUNT(CASE WHEN duration >= 100 THEN 1 END) as count_100_plus
FROM calls 
WHERE duration IS NOT NULL;

-- 5. Testar query específica que simula o Supabase
SELECT id, duration, created_at
FROM calls 
WHERE duration >= 100
ORDER BY duration DESC
LIMIT 10;

-- 6. Se as queries acima funcionam mas o frontend não, o problema É o RLS
-- Se as queries acima NÃO funcionam, o problema é nos dados ou na estrutura
