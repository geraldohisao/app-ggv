-- 🔍 DEBUG: Filtro 100s
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar ligações >= 100s na tabela
SELECT 'Ligações >= 100s na tabela:' as info;
SELECT COUNT(*) as calls_over_100s FROM calls WHERE duration >= 100;

-- 2. Algumas ligações >= 100s
SELECT 'Exemplos >= 100s:' as info;
SELECT 
    id,
    duration,
    duration_formated,
    enterprise,
    person,
    status_voip
FROM calls 
WHERE duration >= 100
ORDER BY duration DESC
LIMIT 5;

-- 3. Testar RPC com 100s
SELECT 'RPC com >= 100s:' as info;
SELECT COUNT(*) as rpc_100s_count
FROM get_calls_with_filters(null, null, null, null, null, 10, 0, 'created_at', 100, null, null, null);

-- 4. Testar alguns registros da RPC com 100s
SELECT 'Alguns registros da RPC >= 100s:' as info;
SELECT 
    id,
    duration,
    enterprise,
    person,
    status_voip_friendly
FROM get_calls_with_filters(null, null, null, null, null, 3, 0, 'created_at', 100, null, null, null)
ORDER BY duration DESC;
