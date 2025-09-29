-- 🧪 TESTE: Remover todos os filtros
-- Execute este script no SQL Editor do Supabase

-- 1. Limpar todos os filtros da interface
-- Vá no frontend e clique em "Limpar Filtros"

-- 2. Testar RPC sem nenhum filtro
SELECT 'RPC sem filtros (deve retornar dados):' as info;
SELECT 
    id,
    enterprise,
    person,
    to_number,
    duration,
    status_voip_friendly,
    score
FROM get_calls_with_filters(null, null, null, null, null, 5, 0, 'created_at', null, null, null, null)
ORDER BY created_at DESC;
