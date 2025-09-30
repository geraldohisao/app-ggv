-- 🧪 TESTE: Ligações elegíveis para análise automática
-- Execute este script no SQL Editor do Supabase

-- 1. Testar função de ligações elegíveis
SELECT 'Ligações elegíveis para análise automática:' as info;
SELECT 
    id,
    enterprise,
    person,
    agent_id,
    duration_seconds,
    LENGTH(transcription) as transcription_length,
    created_at,
    status_voip
FROM get_calls_for_auto_analysis(15, 120); -- 15 ligações, min 2 minutos

-- 2. Verificar ligações pendentes manualmente
SELECT 'Ligações pendentes de análise (critério manual):' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.agent_id,
    EXTRACT(EPOCH FROM c.duration_formated::interval)::INTEGER as duration_seconds,
    LENGTH(c.transcription) as transcription_length,
    c.ai_status,
    c.created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE 
    c.status_voip = 'normal_clearing'
    AND c.duration_formated IS NOT NULL
    AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= 120 -- 2 minutos
    AND c.transcription IS NOT NULL
    AND LENGTH(c.transcription) > 100
    AND (ca.id IS NULL OR c.ai_status IN ('failed', 'pending'))
ORDER BY c.created_at DESC
LIMIT 15;

-- 3. Forçar análise das primeiras 5 ligações elegíveis
-- (Isso simula o que o worker faria automaticamente)
INSERT INTO analysis_queue (call_id, status, priority, created_at)
SELECT 
    c.id,
    'pending',
    1,
    NOW()
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE 
    c.status_voip = 'normal_clearing'
    AND c.duration_formated IS NOT NULL
    AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= 120
    AND c.transcription IS NOT NULL
    AND LENGTH(c.transcription) > 100
    AND (ca.id IS NULL OR c.ai_status IN ('failed', 'pending'))
ORDER BY c.created_at DESC
LIMIT 5
ON CONFLICT (call_id) DO NOTHING;

-- 4. Verificar fila de análise
SELECT 'Fila de análise após adição:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.created_at,
    c.enterprise,
    c.person
FROM analysis_queue aq
JOIN calls c ON aq.call_id = c.id
ORDER BY aq.created_at DESC
LIMIT 10;
