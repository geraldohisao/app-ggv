-- 🔍 INVESTIGAR: Todas as ligações com nota zero
-- Investiga todas as possibilidades de ligações com nota zero

-- 1. Verificar todas as ligações com nota zero (sem filtros)
SELECT 'Todas as ligações com nota zero:' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 20;

-- 2. Verificar ligações com nota zero e seus critérios
SELECT 'Ligações com nota zero e seus critérios:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    ca.final_grade,
    ca.general_feedback,
    -- Critérios do dashboard
    CASE WHEN c.status = 'normal_clearing' THEN '✅' ELSE '❌' END as status_ok,
    CASE WHEN c.duration >= 180 THEN '✅' ELSE '❌' END as duration_ok,
    CASE WHEN LENGTH(c.transcription) >= 100 THEN '✅' ELSE '❌' END as transcription_ok
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 20;

-- 3. Verificar ligações com nota zero que atendem critérios do dashboard
SELECT 'Ligações com nota zero que atendem critérios do dashboard:' as info;
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
ORDER BY ca.created_at DESC;

-- 4. Verificar ligações com nota zero que NÃO atendem critérios do dashboard
SELECT 'Ligações com nota zero que NÃO atendem critérios do dashboard:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    ca.final_grade,
    ca.general_feedback,
    -- Critérios do dashboard
    CASE WHEN c.status = 'normal_clearing' THEN '✅' ELSE '❌' END as status_ok,
    CASE WHEN c.duration >= 180 THEN '✅' ELSE '❌' END as duration_ok,
    CASE WHEN LENGTH(c.transcription) >= 100 THEN '✅' ELSE '❌' END as transcription_ok
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE ca.final_grade = 0
AND (
    c.status != 'normal_clearing'
    OR c.duration < 180
    OR LENGTH(c.transcription) < 100
)
ORDER BY ca.created_at DESC
LIMIT 20;

-- 5. Verificar ligações sem análise
SELECT 'Ligações sem análise:' as info;
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

-- 6. Verificar ligações com nota zero que já estão na fila
SELECT 'Ligações com nota zero que já estão na fila:' as info;
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

-- 7. Verificar ligações com nota zero que não estão na fila
SELECT 'Ligações com nota zero que não estão na fila:' as info;
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
