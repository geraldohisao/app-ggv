-- ✅ VERIFICAR: Completude das Análises
-- Este script verifica se as análises estão sendo completadas com sucesso

-- 1. Verificar análises completadas recentemente
SELECT '1. Análises completadas recentemente:' as info;
SELECT 
    ca.id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.scorecard_id,
    ca.confidence,
    ca.created_at
FROM call_analysis ca
WHERE ca.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY ca.created_at DESC
LIMIT 10;

-- 2. Verificar ligações com análise bem-sucedida
SELECT '2. Ligações com análise bem-sucedida:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.duration,
    c.call_type,
    c.ai_status,
    ca.final_grade,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.created_at >= NOW() - INTERVAL '1 hour'
AND ca.final_grade IS NOT NULL
AND ca.final_grade > 0
ORDER BY ca.created_at DESC
LIMIT 10;

-- 3. Verificar ligações com análise falhada
SELECT '3. Ligações com análise falhada:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.duration,
    c.call_type,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.created_at >= NOW() - INTERVAL '1 hour'
AND (ca.final_grade IS NULL OR ca.final_grade = 0)
ORDER BY ca.created_at DESC
LIMIT 10;

-- 4. Verificar status atual da fila
SELECT '4. Status atual da fila:' as info;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM analysis_queue;

-- 5. Verificar ligações que ainda precisam de análise
SELECT '5. Ligações que ainda precisam de análise:' as info;
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
