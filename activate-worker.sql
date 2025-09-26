-- 🚀 ATIVAR: Worker de Análise
-- Este script ativa o worker e força o processamento das ligações pendentes

-- 1. Verificar configuração do worker
SELECT '1. Configuração do worker:' as info;
SELECT key, value FROM app_settings WHERE key = 'worker_enabled';

-- 2. Ativar o worker (se não estiver ativo)
INSERT INTO app_settings (key, value) 
VALUES ('worker_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 3. Verificar ligações mais antigas pendentes
SELECT '2. Ligações mais antigas pendentes:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at,
    c.provider_call_id,
    c.duration,
    c.call_type
FROM analysis_queue aq
JOIN calls c ON c.id = aq.call_id
WHERE aq.status = 'pending'
ORDER BY aq.created_at ASC
LIMIT 5;

-- 4. Verificar se há ligações com erro na análise
SELECT '3. Ligações com erro na análise:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.duration,
    c.call_type,
    c.ai_status,
    c.created_at
FROM calls c
WHERE c.ai_status = 'failed'
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. Verificar configurações de timeout
SELECT '4. Configurações de timeout:' as info;
SELECT key, value FROM app_settings 
WHERE key IN ('gemini_timeout_ms', 'deepseek_timeout_ms', 'analysis_batch_size');

-- 6. Forçar processamento das 5 ligações mais antigas
SELECT '5. Forçando processamento das 5 ligações mais antigas:' as info;
UPDATE analysis_queue 
SET status = 'processing', priority = 1
WHERE id IN (
    SELECT aq.id
    FROM analysis_queue aq
    WHERE aq.status = 'pending'
    ORDER BY aq.created_at ASC
    LIMIT 5
);

-- 7. Verificar resultado
SELECT '6. Status após ativação:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;
