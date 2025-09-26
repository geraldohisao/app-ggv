-- 🔍 VERIFICAR: Configuração do worker de análise
-- Verifica se o worker está configurado corretamente

-- 1. Verificar configurações do worker
SELECT 'Configurações do worker:' as info;
SELECT 
    key,
    value
FROM app_settings 
WHERE key LIKE '%worker%' 
OR key LIKE '%analysis%'
OR key LIKE '%queue%'
ORDER BY key;

-- 2. Verificar configurações de IA
SELECT 'Configurações de IA:' as info;
SELECT 
    key,
    value
FROM app_settings 
WHERE key LIKE '%gemini%' 
OR key LIKE '%deepseek%'
OR key LIKE '%ai%'
ORDER BY key;

-- 3. Verificar se há ligações elegíveis que não estão na fila
SELECT 'Ligações elegíveis que não estão na fila:' as info;
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

-- 4. Verificar se há ligações com final_grade = -1 que não estão na fila
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

-- 5. Adicionar ligações elegíveis que não estão na fila
INSERT INTO analysis_queue (call_id, status, created_at)
SELECT 
    c.id as call_id,
    'pending',
    NOW()
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.status = 'normal_clearing'
AND c.duration >= 180
AND LENGTH(c.transcription) >= 100
AND ca.id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = c.id 
    AND aq.status IN ('pending', 'processing')
);

-- 6. Adicionar ligações com final_grade = -1 que não estão na fila
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

-- 7. Verificar quantas ligações foram adicionadas à fila
SELECT 'Ligações adicionadas à fila:' as info;
SELECT 
    COUNT(*) as total_adicionadas
FROM analysis_queue 
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- 8. Verificar status final da fila
SELECT 'Status final da fila:' as info;
SELECT 
    status,
    COUNT(*) as total_registros
FROM analysis_queue
GROUP BY status
ORDER BY status;
