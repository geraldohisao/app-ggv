-- 🤖 FORÇAR INÍCIO DA ANÁLISE AUTOMÁTICA
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se temos chamadas pending
SELECT 'CHAMADAS PENDING PARA ANÁLISE:' as info;
SELECT 
    c.id,
    c.agent_id,
    c.enterprise,
    c.person,
    LENGTH(c.transcription) as transcription_length,
    c.duration_formated,
    c.ai_status,
    c.created_at
FROM calls c
WHERE c.ai_status = 'pending'
ORDER BY c.created_at ASC
LIMIT 10;

-- 2. Verificar configurações
SELECT 'CONFIGURAÇÕES ATUAIS:' as info;
SELECT key, value FROM app_settings WHERE key LIKE '%auto%';

-- 3. Forçar processamento manual das 17 chamadas pending
-- Vamos processar uma chamada manualmente para testar
SELECT 'PRIMEIRA CHAMADA PENDING PARA TESTE:' as info;
SELECT 
    c.id,
    c.transcription,
    c.agent_id,
    c.enterprise,
    c.person
FROM calls c
WHERE c.ai_status = 'pending'
ORDER BY c.created_at ASC
LIMIT 1;

-- 4. Verificar se a função RPC está funcionando
SELECT 'TESTE DA FUNÇÃO RPC:' as info;
SELECT * FROM get_calls_for_auto_analysis(5, 180) LIMIT 3;
