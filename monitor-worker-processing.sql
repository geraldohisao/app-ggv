-- 📊 MONITORAR: Worker de análise automática
-- Monitora se o worker está processando ligações automaticamente

-- 1. Verificar ligações sendo processadas agora
SELECT 'Ligações sendo processadas agora:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'processing'
ORDER BY aq.created_at ASC;

-- 2. Verificar ligações processadas nos últimos 10 minutos
SELECT 'Ligações processadas nos últimos 10 minutos:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'completed'
AND aq.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 3. Verificar ligações que falharam nos últimos 10 minutos
SELECT 'Ligações que falharam nos últimos 10 minutos:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    aq.error_message
FROM analysis_queue aq
WHERE aq.status = 'failed'
AND aq.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY aq.created_at DESC
LIMIT 10;

-- 4. Verificar ligações pendentes mais antigas
SELECT 'Ligações pendentes mais antigas:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
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

-- 6. Verificar se há ligações processando há muito tempo (possível travamento)
SELECT 'Ligações processando há muito tempo (possível travamento):' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_processando
FROM analysis_queue aq
WHERE aq.status = 'processing'
AND aq.created_at < NOW() - INTERVAL '30 minutes'
ORDER BY aq.created_at ASC;

-- 7. Verificar ligações com final_grade = -1 que ainda precisam ser processadas
SELECT 'Ligações com final_grade = -1 que ainda precisam ser processadas:' as info;
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
ORDER BY ca.created_at DESC
LIMIT 10;
