-- 🔍 VERIFICAR: Status da Fila de Análise
-- Este script verifica se as 4 ligações que falharam estão na fila de análise

-- IDs das 4 ligações que falharam na análise em lote
-- c93ecf80-d038-4f1f-a7b9-1be42ff381b5
-- 85111b73-9fbb-4c9c-af09-c5607ca7e5db
-- f494a8c7-78a4-4805-a32b-b55aa2ecda19
-- a85dd561-4f08-4d41-9678-cece56a29089

-- 1. Verificar se as 4 ligações estão na fila
SELECT '1. Verificar se as 4 ligações estão na fila:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at
FROM analysis_queue aq
WHERE aq.call_id IN (
    'c93ecf80-d038-4f1f-a7b9-1be42ff381b5',
    '85111b73-9fbb-4c9c-af09-c5607ca7e5db',
    'f494a8c7-78a4-4805-a32b-b55aa2ecda19',
    'a85dd561-4f08-4d41-9678-cece56a29089'
)
ORDER BY aq.created_at DESC;

-- 2. Verificar status geral da fila
SELECT '2. Status geral da fila:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;

-- 3. Verificar entradas recentes na fila
SELECT '3. Entradas recentes na fila:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at
FROM analysis_queue aq
ORDER BY aq.created_at DESC
LIMIT 10;

-- 4. Verificar se há ligações pendentes de análise
SELECT '4. Ligações pendentes de análise:' as info;
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
ORDER BY c.created_at DESC
LIMIT 10;
