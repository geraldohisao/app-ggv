-- 🔍 INVESTIGAR: Problema do worker de análise
-- Investiga por que o worker não está processando ligações automaticamente

-- 1. Verificar ligações na fila há muito tempo
SELECT 'Ligações na fila há muito tempo:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
ORDER BY aq.created_at ASC
LIMIT 10;

-- 2. Verificar se há ligações sendo processadas
SELECT 'Ligações sendo processadas:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'processing'
ORDER BY aq.created_at ASC;

-- 3. Verificar ligações que foram processadas recentemente
SELECT 'Ligações processadas recentemente:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    aq.error_message
FROM analysis_queue aq
WHERE aq.status = 'completed'
AND aq.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 4. Verificar ligações que falharam recentemente
SELECT 'Ligações que falharam recentemente:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    aq.error_message
FROM analysis_queue aq
WHERE aq.status = 'failed'
AND aq.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 5. Verificar status geral da fila
SELECT 'Status geral da fila:' as info;
SELECT 
    status,
    COUNT(*) as total_registros,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM analysis_queue
GROUP BY status
ORDER BY status;

-- 6. Verificar se há ligações com final_grade = -1 que não estão na fila
SELECT 'Ligações com final_grade = -1 que não estão na fila:' as info;
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
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = c.id 
    AND aq.status IN ('pending', 'processing')
)
ORDER BY ca.created_at DESC
LIMIT 10;

-- 7. Verificar se há ligações elegíveis que não têm análise
SELECT 'Ligações elegíveis que não têm análise:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.status = 'normal_clearing'
AND c.duration >= 180
AND LENGTH(c.transcription) >= 100
AND ca.id IS NULL
ORDER BY c.created_at DESC
LIMIT 10;
