-- 🔧 CORRIGIR: Critérios do dashboard para análise
-- Ajusta critérios para incluir ligações com nota zero que precisam ser reprocessadas

-- 1. Verificar critérios atuais do dashboard
SELECT 'Critérios atuais do dashboard:' as info;
SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN duration >= 180 THEN 1 END) as mais_3_minutos,
    COUNT(CASE WHEN LENGTH(transcription) >= 100 THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN status = 'normal_clearing' AND duration >= 180 AND LENGTH(transcription) >= 100 THEN 1 END) as elegiveis
FROM calls;

-- 2. Verificar ligações elegíveis que têm nota zero
SELECT 'Ligações elegíveis com nota zero:' as info;
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

-- 3. Verificar se há ligações que precisam ser adicionadas à fila
SELECT 'Ligações que precisam ser adicionadas à fila:' as info;
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
ORDER BY ca.created_at DESC;

-- 4. Adicionar ligações com nota zero à fila de reprocessamento
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
AND ca.final_grade = 0
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = c.id 
    AND aq.status IN ('pending', 'processing')
);

-- 5. Verificar fila após adicionar ligações
SELECT 'Fila após adicionar ligações:' as info;
SELECT 
    COUNT(*) as total_na_fila,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as falharam
FROM analysis_queue;

-- 6. Verificar ligações que ainda têm nota zero
SELECT 'Ligações que ainda têm nota zero:' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC
LIMIT 10;
