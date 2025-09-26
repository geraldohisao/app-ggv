-- 🔍 VERIFICAR: Critérios do dashboard para análise
-- Verifica por que o dashboard não mostra ligações para processar

-- 1. Verificar critérios atuais do dashboard
SELECT 'Critérios atuais do dashboard:' as info;
SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN duration >= 180 THEN 1 END) as mais_3_minutos,
    COUNT(CASE WHEN LENGTH(transcription) >= 100 THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN status = 'normal_clearing' AND duration >= 180 AND LENGTH(transcription) >= 100 THEN 1 END) as elegiveis
FROM calls;

-- 2. Verificar ligações elegíveis que têm análise
SELECT 'Ligações elegíveis que têm análise:' as info;
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
ORDER BY ca.created_at DESC
LIMIT 20;

-- 3. Verificar ligações elegíveis que NÃO têm análise
SELECT 'Ligações elegíveis que NÃO têm análise:' as info;
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
LIMIT 20;

-- 4. Verificar ligações elegíveis que têm nota zero
SELECT 'Ligações elegíveis que têm nota zero:' as info;
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
AND ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 20;

-- 5. Verificar ligações elegíveis que têm nota válida
SELECT 'Ligações elegíveis que têm nota válida:' as info;
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
AND ca.final_grade > 0
ORDER BY ca.created_at DESC
LIMIT 20;

-- 6. Verificar ligações elegíveis que têm nota zero e estão na fila
SELECT 'Ligações elegíveis com nota zero que estão na fila:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    ca.final_grade,
    ca.general_feedback,
    aq.status as queue_status,
    aq.created_at as queue_created_at
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN analysis_queue aq ON c.id = aq.call_id
WHERE c.status = 'normal_clearing'
AND c.duration >= 180
AND LENGTH(c.transcription) >= 100
AND ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 20;

-- 7. Verificar ligações elegíveis que têm nota zero e NÃO estão na fila
SELECT 'Ligações elegíveis com nota zero que NÃO estão na fila:' as info;
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
AND ca.final_grade = 0
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = c.id 
    AND aq.status IN ('pending', 'processing')
)
ORDER BY ca.created_at DESC
LIMIT 20;
