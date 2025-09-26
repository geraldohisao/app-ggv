-- 🔄 ADICIONAR: Ligações com análise falhada à fila de reprocessamento
-- Adiciona ligações com final_grade = NULL à fila para reprocessamento

-- 1. Verificar ligações com análise falhada
SELECT 'Ligações com análise falhada (final_grade = -1):' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    ca.final_grade,
    ca.general_feedback
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.status = 'normal_clearing'
AND c.duration >= 180
AND LENGTH(c.transcription) >= 100
AND ca.final_grade = -1
ORDER BY ca.created_at DESC;

-- 2. Adicionar ligações com análise falhada à fila de reprocessamento
INSERT INTO analysis_queue (call_id, status, created_at)
SELECT 
    c.id as call_id,
    'pending',
    NOW()
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.status = 'normal_clearing'
AND c.duration >= 180
AND LENGTH(c.transcription) >= 100
AND ca.final_grade = -1
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = c.id 
    AND aq.status IN ('pending', 'processing')
);

-- 3. Verificar quantas ligações foram adicionadas à fila
SELECT 'Ligações adicionadas à fila:' as info;
SELECT 
    COUNT(*) as total_adicionadas
FROM analysis_queue 
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- 4. Verificar status atual da fila
SELECT 'Status atual da fila:' as info;
SELECT 
    status,
    COUNT(*) as total_registros
FROM analysis_queue
GROUP BY status
ORDER BY status;

-- 5. Verificar ligações que ainda têm análise falhada
SELECT 'Ligações que ainda têm análise falhada:' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = -1
ORDER BY ca.created_at DESC
LIMIT 10;

-- 6. Verificar ligações na fila que não foram processadas
SELECT 'Ligações na fila que não foram processadas:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
ORDER BY aq.created_at ASC
LIMIT 10;
