-- 🔍 VERIFICAR: Status do worker de análise automática (SIMPLIFICADO)
-- Verifica se o worker está funcionando e por que não processa automaticamente

-- 1. Verificar configurações do worker
SELECT 'Configurações do worker:' as info;
SELECT 
    key,
    value
FROM app_settings 
WHERE key LIKE '%worker%' 
OR key LIKE '%analysis%'
OR key LIKE '%queue%'
ORDER BY key;

-- 2. Verificar ligações na fila há mais de 1 hora
SELECT 'Ligações na fila há mais de 1 hora:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
AND aq.created_at < NOW() - INTERVAL '1 hour'
ORDER BY aq.created_at ASC
LIMIT 10;

-- 3. Verificar ligações que falharam
SELECT 'Ligações que falharam na análise:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    aq.error_message
FROM analysis_queue aq
WHERE aq.status = 'failed'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 4. Verificar se há ligações processando há muito tempo
SELECT 'Ligações processando há muito tempo:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_processando
FROM analysis_queue aq
WHERE aq.status = 'processing'
AND aq.created_at < NOW() - INTERVAL '30 minutes'
ORDER BY aq.created_at ASC;

-- 5. Verificar configurações de IA
SELECT 'Configurações de IA:' as info;
SELECT 
    key,
    value
FROM app_settings 
WHERE key LIKE '%gemini%' 
OR key LIKE '%deepseek%'
OR key LIKE '%ai%'
ORDER BY key;

-- 6. Verificar status geral da fila
SELECT 'Status geral da fila de análise:' as info;
SELECT 
    status,
    COUNT(*) as total_registros
FROM analysis_queue
GROUP BY status
ORDER BY status;
