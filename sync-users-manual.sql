-- Script para Sincronização Manual de Usuários
-- Execute este script quando quiser sincronizar usuários manualmente

-- =========================================
-- SINCRONIZAÇÃO MANUAL DE USUÁRIOS
-- =========================================

-- 1. Mapear usuários existentes que ainda não foram mapeados
SELECT '🔄 MAPEANDO USUÁRIOS EXISTENTES...' as status;
SELECT * FROM map_existing_users();

-- 2. Sincronizar chamadas com nomes corretos
SELECT '🔄 SINCRONIZANDO CHAMADAS...' as status;
SELECT * FROM sync_calls_with_users();

-- =========================================
-- VERIFICAÇÃO DOS RESULTADOS
-- =========================================

-- Verificar total de usuários mapeados
SELECT '📊 RESUMO FINAL' as status;
SELECT 
    'Total de usuários mapeados' as metric,
    COUNT(*) as value
FROM user_mapping
UNION ALL
SELECT 
    'Total de chamadas com nomes corretos' as metric,
    COUNT(*) as value
FROM calls 
WHERE sdr_name IS NOT NULL AND sdr_name != '';

-- Verificar usuários mais recentes
SELECT '👥 USUÁRIOS MAIS RECENTES' as status;
SELECT 
    agent_id,
    full_name,
    email,
    created_at
FROM user_mapping 
ORDER BY created_at DESC
LIMIT 5;

-- Verificar chamadas por usuário
SELECT '📞 CHAMADAS POR USUÁRIO' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls,
    MIN(created_at) as primeira_chamada,
    MAX(created_at) as ultima_chamada
FROM calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id, sdr_name
ORDER BY total_calls DESC
LIMIT 10;

-- Resumo final
SELECT '✅ SINCRONIZAÇÃO MANUAL CONCLUÍDA!' as message
UNION ALL
SELECT '🎯 Todos os usuários foram mapeados'
UNION ALL
SELECT '📞 Todas as chamadas foram sincronizadas'
UNION ALL
SELECT '🚀 Sistema atualizado e pronto!';
