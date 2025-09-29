-- 🔧 SUBSTITUIR: Função original por versão corrigida
-- Execute este script no SQL Editor do Supabase

-- 1. Remover função original (se existir)
DROP FUNCTION IF EXISTS get_calls_with_filters CASCADE;

-- 2. Renomear função de teste para função original
ALTER FUNCTION get_calls_with_filters_test RENAME TO get_calls_with_filters;

-- 3. Conceder permissões para a função renomeada
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO service_role;

-- 4. Testar função final
SELECT 'Função original substituída com sucesso!' as status;

-- 5. Teste final com parâmetros reais
SELECT 
    'Teste final:' as info,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 10, 0, 'created_at', null, null, null, null
);

-- 6. Teste com filtro de nota mínima
SELECT 
    'Teste com filtro min_score=8:' as info,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 10, 0, 'created_at', null, null, 8.0, null
);
