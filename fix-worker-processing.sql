-- 🔧 CORRIGIR: Worker de análise automática
-- Corrige problemas do worker e adiciona ligações à fila

-- 1. Adicionar ligações com final_grade = -1 à fila de reprocessamento
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

-- 2. Adicionar ligações elegíveis que não têm análise à fila
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

-- 5. Verificar ligações que ainda precisam ser processadas
SELECT 'Ligações que ainda precisam ser processadas:' as info;
SELECT 
    aq.call_id,
    aq.status,
    aq.created_at,
    NOW() - aq.created_at as tempo_na_fila
FROM analysis_queue aq
WHERE aq.status = 'pending'
ORDER BY aq.created_at ASC
LIMIT 10;

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

-- 7. Resetar ligações processando há muito tempo (possível travamento)
UPDATE analysis_queue 
SET 
    status = 'pending',
    created_at = NOW()
WHERE status = 'processing'
AND created_at < NOW() - INTERVAL '30 minutes';

-- 8. Verificar status final da fila
SELECT 'Status final da fila:' as info;
SELECT 
    status,
    COUNT(*) as total_registros
FROM analysis_queue
GROUP BY status
ORDER BY status;
