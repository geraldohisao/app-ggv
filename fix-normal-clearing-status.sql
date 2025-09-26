-- 🔧 CORRIGIR: Status para ligações com normal_clearing
-- Script para corrigir status_voip_friendly para ligações com status_voip = 'normal_clearing'

-- 1. Verificar quantas ligações têm status_voip = 'normal_clearing' e status_voip_friendly = NULL
SELECT 'Ligações com normal_clearing e status_voip_friendly = NULL:' as info;
SELECT 
    COUNT(*) as total_com_problema
FROM calls c
WHERE c.status_voip = 'normal_clearing' 
AND c.status_voip_friendly IS NULL;

-- 2. Atualizar status_voip_friendly para 'Atendida' para todas as ligações com normal_clearing
UPDATE calls 
SET 
    status_voip_friendly = 'Atendida',
    updated_at = NOW()
WHERE status_voip = 'normal_clearing' 
AND status_voip_friendly IS NULL;

-- 3. Verificar quantas ligações foram atualizadas
SELECT 'Ligações atualizadas:' as info;
SELECT 
    COUNT(*) as total_atualizadas
FROM calls 
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- 4. Verificar resultado após correção
SELECT 'Status após correção:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.status_voip_friendly,
    c.agent_id,
    c.call_type,
    c.duration
FROM calls c
WHERE c.status_voip = 'normal_clearing'
ORDER BY c.updated_at DESC
LIMIT 10;

-- 5. Verificar se ainda há ligações com status_voip_friendly = NULL
SELECT 'Ligações ainda com status_voip_friendly = NULL:' as info;
SELECT 
    COUNT(*) as total_ainda_null
FROM calls c
WHERE c.status_voip_friendly IS NULL;

-- 6. Estatísticas finais
SELECT 'Estatísticas finais:' as info;
SELECT 
    status_voip_friendly,
    COUNT(*) as total
FROM calls 
WHERE status_voip_friendly IS NOT NULL
GROUP BY status_voip_friendly
ORDER BY total DESC;
