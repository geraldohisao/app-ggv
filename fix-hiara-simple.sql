-- 🔧 CORREÇÃO SIMPLES: Apenas a ligação da Hiara
-- Script direto para corrigir o status_voip_friendly da ligação da Hiara

-- 1. Encontrar a ligação da Hiara
SELECT 'Ligação da Hiara:' as info;
SELECT 
    c.id,
    c.agent_id,
    c.status_voip,
    c.status_voip_friendly
FROM calls c
WHERE c.agent_id = 'Hiara Saienne'
ORDER BY c.created_at DESC
LIMIT 1;

-- 2. Corrigir apenas a ligação da Hiara
UPDATE calls 
SET 
    status_voip_friendly = 'Atendida',
    updated_at = NOW()
WHERE agent_id = 'Hiara Saienne';

-- 3. Verificar se funcionou
SELECT 'Status após correção:' as info;
SELECT 
    c.id,
    c.agent_id,
    c.status_voip,
    c.status_voip_friendly
FROM calls c
WHERE c.agent_id = 'Hiara Saienne';
