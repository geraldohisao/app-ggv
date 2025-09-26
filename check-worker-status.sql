-- 🔍 VERIFICAR: Status do worker e fila de análise
-- Script para verificar se o worker está funcionando

-- 1. Verificar entradas na fila de análise
SELECT 'Entradas na fila de análise:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;

-- 2. Verificar entradas recentes na fila
SELECT 'Entradas recentes na fila:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at
FROM analysis_queue aq
ORDER BY aq.created_at DESC
LIMIT 10;

-- 3. Verificar se há entradas para as 4 ligações que falharam
SELECT 'Entradas para as 4 ligações que falharam:' as info;
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

-- 4. Verificar configurações do sistema
SELECT 'Todas as configurações do sistema:' as info;
SELECT 
    key,
    value
FROM app_settings
ORDER BY key;