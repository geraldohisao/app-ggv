-- 🔍 DEBUG COMPLETO: Por que análise automática não está funcionando
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar chamadas que precisam de análise
SELECT 'CHAMADAS QUE PRECISAM DE ANÁLISE:' as info;
SELECT 
    c.id,
    c.agent_id,
    c.enterprise,
    c.person,
    c.status_voip,
    c.duration_formated,
    EXTRACT(EPOCH FROM c.duration_formated::interval) as duration_seconds,
    LENGTH(c.transcription) as transcription_length,
    c.ai_status,
    ca.id as has_analysis,
    c.created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE 
    c.status_voip = 'normal_clearing'
    AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= 180
    AND LENGTH(c.transcription) > 100
    AND ca.id IS NULL
    AND c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY c.created_at DESC
LIMIT 20;

-- 2. Verificar configurações do sistema
SELECT 'CONFIGURAÇÕES ATUAIS:' as info;
SELECT key, value FROM app_settings WHERE key LIKE '%auto%' OR key LIKE '%analysis%';

-- 3. Verificar se a função RPC está funcionando
SELECT 'FUNÇÃO get_calls_for_auto_analysis:' as info;
SELECT COUNT(*) as total_eligible FROM get_calls_for_auto_analysis(20, 180);

-- 4. Verificar últimas análises realizadas
SELECT 'ÚLTIMAS ANÁLISES REALIZADAS:' as info;
SELECT 
    ca.created_at,
    ca.call_id,
    ca.final_grade,
    c.agent_id,
    c.enterprise
FROM call_analysis ca
JOIN calls c ON c.id = ca.call_id
ORDER BY ca.created_at DESC
LIMIT 10;

-- 5. Verificar status das chamadas
SELECT 'STATUS DAS CHAMADAS:' as info;
SELECT 
    ai_status,
    COUNT(*) as count
FROM calls 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY ai_status
ORDER BY count DESC;
