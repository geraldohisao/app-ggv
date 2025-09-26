-- 🔧 FORÇAR: Processamento do Worker
-- Este script força o processamento das ligações pendentes na fila

-- 1. Verificar ligações pendentes na fila
SELECT '1. Ligações pendentes na fila:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at
FROM analysis_queue aq
WHERE aq.status = 'pending'
ORDER BY aq.priority DESC, aq.created_at ASC;

-- 2. Verificar ligações com ai_status = 'pending'
SELECT '2. Ligações com ai_status = pending:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.duration,
    c.call_type,
    c.ai_status,
    c.created_at
FROM calls c
WHERE c.ai_status = 'pending'
ORDER BY c.created_at DESC;

-- 3. Verificar se há ligações sem entrada na fila
SELECT '3. Ligações sem entrada na fila:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.duration,
    c.call_type,
    c.ai_status,
    c.created_at
FROM calls c
WHERE c.ai_status = 'pending'
AND c.id NOT IN (
    SELECT DISTINCT aq.call_id 
    FROM analysis_queue aq 
    WHERE aq.status IN ('pending', 'processing')
)
ORDER BY c.created_at DESC;

-- 4. Adicionar ligações pendentes à fila (se necessário)
INSERT INTO analysis_queue (call_id, status, priority, created_at)
SELECT 
    c.id as call_id,
    'pending' as status,
    1 as priority,
    NOW() as created_at
FROM calls c
WHERE c.ai_status = 'pending'
AND c.id NOT IN (
    SELECT DISTINCT aq.call_id 
    FROM analysis_queue aq 
    WHERE aq.status IN ('pending', 'processing')
)
ON CONFLICT (call_id) DO NOTHING;

-- 5. Verificar resultado final
SELECT '5. Status final da fila:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;