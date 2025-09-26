-- 📊 MONITORAR: Progresso do Worker
-- Este script monitora o progresso do worker e verifica se está processando

-- 1. Status atual da fila
SELECT '1. Status atual da fila:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;

-- 2. Ligações em processamento
SELECT '2. Ligações em processamento:' as info;
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
WHERE aq.status = 'processing'
ORDER BY aq.created_at ASC;

-- 3. Ligações completadas recentemente
SELECT '3. Ligações completadas recentemente:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.created_at,
    c.provider_call_id,
    c.duration,
    c.call_type
FROM analysis_queue aq
JOIN calls c ON c.id = aq.call_id
WHERE aq.status = 'completed'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 4. Verificar se há ligações com erro
SELECT '4. Ligações com erro:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.created_at,
    c.provider_call_id,
    c.duration,
    c.call_type
FROM analysis_queue aq
JOIN calls c ON c.id = aq.call_id
WHERE aq.status = 'failed'
ORDER BY aq.created_at DESC
LIMIT 5;

-- 5. Verificar ligações pendentes mais antigas
SELECT '5. Ligações pendentes mais antigas:' as info;
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
