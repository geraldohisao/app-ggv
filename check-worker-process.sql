-- 🔍 VERIFICAR: Processo do worker de análise
-- Verifica se o worker está funcionando e processando ligações

-- 1. Verificar se há ligações sendo processadas
SELECT 'Ligações sendo processadas:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'processing'
ORDER BY aq.created_at ASC;

-- 2. Verificar ligações que foram processadas recentemente
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

-- 3. Verificar ligações que falharam recentemente
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

-- 4. Verificar se há ligações pendentes há muito tempo
SELECT 'Ligações pendentes há muito tempo:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
AND aq.created_at < NOW() - INTERVAL '30 minutes'
ORDER BY aq.created_at ASC
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

-- 6. Verificar se há ligações com nota zero que não estão na fila
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
LIMIT 10;
