-- 🔍 INVESTIGAR: Problema com ligações com nota zero
-- Verifica por que ainda existem ligações com nota zero e por que não aparecem no dashboard

-- 1. Verificar ligações com nota zero atuais
SELECT 'Ligações com nota zero atuais:' as info;
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
LIMIT 10;

-- 2. Verificar critérios do dashboard para essas ligações
SELECT 'Critérios do dashboard para ligações com nota zero:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    c.transcription,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    c.insights,
    ca.final_grade,
    ca.general_feedback
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 5;

-- 3. Verificar se ligações atendem critérios do dashboard
SELECT 'Ligações que atendem critérios do dashboard:' as info;
SELECT 
    c.id as call_id,
    c.status,
    c.duration,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_length,
    c.call_type,
    ca.final_grade,
    -- Critérios do dashboard
    CASE WHEN c.status = 'normal_clearing' THEN '✅' ELSE '❌' END as status_ok,
    CASE WHEN c.duration >= 180 THEN '✅' ELSE '❌' END as duration_ok,
    CASE WHEN LENGTH(c.transcription) >= 100 THEN '✅' ELSE '❌' END as transcription_ok,
    CASE WHEN ca.final_grade = 0 THEN '❌' ELSE '✅' END as grade_ok
FROM calls c
JOIN call_analysis ca ON c.id = ca.call_id
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 10;

-- 4. Verificar status da fila de análise
SELECT 'Status da fila de análise:' as info;
SELECT 
    COUNT(*) as total_na_fila,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as falharam
FROM analysis_queue;

-- 5. Verificar ligações que deveriam aparecer no dashboard
SELECT 'Ligações que deveriam aparecer no dashboard:' as info;
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

-- 6. Verificar se há ligações sem análise
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
LIMIT 10;
