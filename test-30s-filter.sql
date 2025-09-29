-- 🧪 TESTE: Filtro com 30s
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar ligações >= 30s
SELECT 'Ligações >= 30s:' as info;
SELECT COUNT(*) as calls_over_30s FROM calls WHERE duration >= 30;

-- 2. Testar RPC com 30s
SELECT 'RPC com >= 30s:' as info;
SELECT 
    id,
    enterprise,
    person,
    duration,
    status_voip_friendly,
    to_number
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', 30, null, null, null)
ORDER BY created_at DESC;
