-- 🧪 TESTE DIRETO: Duração
-- Execute este script no SQL Editor do Supabase

-- 1. Testar RPC sem nenhum filtro
SELECT 'RPC sem filtros:' as info;
SELECT COUNT(*) as sem_filtros
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', null, null, null, null);

-- 2. Verificar ligações na tabela calls
SELECT 'Tabela calls:' as info;
SELECT COUNT(*) as total_calls FROM calls;

-- 3. Verificar ligações >= 60s (mais baixo)
SELECT 'Calls >= 60s:' as info;
SELECT COUNT(*) as calls_over_60s FROM calls WHERE duration >= 60;

-- 4. Testar RPC com duração >= 60s
SELECT 'RPC com >= 60s:' as info;
SELECT COUNT(*) as rpc_60s
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', 60, null, null, null);
