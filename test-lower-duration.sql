-- 🧪 TESTE: Duração menor
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar ligações >= 30s
SELECT 'Ligações >= 30s:' as info;
SELECT COUNT(*) as calls_over_30s FROM calls WHERE duration >= 30;

-- 2. Verificar ligações >= 60s  
SELECT 'Ligações >= 60s:' as info;
SELECT COUNT(*) as calls_over_60s FROM calls WHERE duration >= 60;

-- 3. Testar RPC com 30s
SELECT 'RPC com >= 30s:' as info;
SELECT COUNT(*) as rpc_30s
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', 30, null, null, null);

-- 4. Algumas ligações >= 30s
SELECT 'Exemplos >= 30s:' as info;
SELECT 
    id,
    duration,
    duration_formated,
    enterprise,
    person
FROM calls 
WHERE duration >= 30
ORDER BY created_at DESC
LIMIT 3;
