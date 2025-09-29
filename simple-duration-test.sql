-- 🔍 TESTE SIMPLES: Filtro de Duração
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar ligações com duração >= 100 segundos
SELECT 
    COUNT(*) as total_calls_over_100s
FROM calls 
WHERE duration >= 100;

-- 2. Testar a RPC com filtro de duração mínima
SELECT 
    COUNT(*) as rpc_result_count
FROM get_calls_with_filters(
    null, null, null, null, null, 10, 0, 'created_at', 100, null, null, null
);

-- 3. Verificar algumas ligações com duração >= 100s
SELECT 
    id,
    duration,
    status_voip,
    created_at
FROM calls 
WHERE duration >= 100
ORDER BY created_at DESC
LIMIT 3;
