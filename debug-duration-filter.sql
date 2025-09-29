-- 🔍 DEBUG: Filtro de Duração
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar ligações com duração >= 100 segundos
SELECT 'Ligações com duração >= 100 segundos:' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    duration,
    duration_formated,
    status_voip,
    created_at
FROM calls 
WHERE duration >= 100
ORDER BY created_at DESC
LIMIT 10;

-- 2. Testar a RPC com filtro de duração mínima
SELECT 'Testando RPC com filtro de duração mínima (100s):' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    duration,
    status_voip,
    status_voip_friendly,
    score
FROM get_calls_with_filters(
    null, null, null, null, null, 10, 0, 'created_at', 100, null, null, null
)
ORDER BY created_at DESC;

-- 3. Verificar parâmetros da função
SELECT 'Verificando definição da função:' as info;
SELECT 
    proname,
    pg_get_function_arguments(oid) as argumentos
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 4. Verificar estatísticas de duração
SELECT 'Estatísticas de duração:' as info;
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration >= 100 THEN 1 END) as calls_over_100s,
    COUNT(CASE WHEN duration >= 60 THEN 1 END) as calls_over_60s,
    COUNT(CASE WHEN duration >= 30 THEN 1 END) as calls_over_30s,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration,
    MIN(duration) as min_duration
FROM calls;
