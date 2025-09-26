-- 🔍 TESTAR: Edição de etapa
-- Script para verificar se a edição de etapa está funcionando

-- 1. Verificar ligação da Hiara antes da edição
SELECT 'Ligação da Hiara ANTES da edição:' as info;
SELECT 
    c.id,
    c.call_type,
    c.agent_id,
    c.created_at,
    c.updated_at
FROM calls c
WHERE c.agent_id = 'Hiara Saienne'
ORDER BY c.created_at DESC
LIMIT 1;

-- 2. Testar a função edit_call_etapa diretamente
SELECT 'Testando função edit_call_etapa:' as info;
SELECT * FROM edit_call_etapa(
    '495aca80-b525-41e6-836e-0e9208e6c73b', 
    'Ligação'
);

-- 3. Verificar ligação da Hiara após a edição
SELECT 'Ligação da Hiara APÓS a edição:' as info;
SELECT 
    c.id,
    c.call_type,
    c.agent_id,
    c.created_at,
    c.updated_at
FROM calls c
WHERE c.agent_id = 'Hiara Saienne'
ORDER BY c.updated_at DESC
LIMIT 1;
