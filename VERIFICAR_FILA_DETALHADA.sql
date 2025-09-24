-- 🔍 VERIFICAR FILA DETALHADA
-- Execute no Supabase SQL Editor

-- 1. Status da fila
SELECT 
  'FILA STATUS' as info,
  status,
  COUNT(*) as quantidade
FROM analysis_queue
GROUP BY status;

-- 2. Verificar se há chamadas sem análise
SELECT 
  'CHAMADAS SEM ANÁLISE' as info,
  COUNT(*) as quantidade
FROM calls c
WHERE c.id NOT IN (SELECT call_id FROM call_analysis)
  AND c.duration >= 30
  AND c.transcription IS NOT NULL
  AND c.transcription != '';

-- 3. Verificar se há chamadas elegíveis para análise
SELECT 
  'CHAMADAS ELEGÍVEIS' as info,
  COUNT(*) as quantidade,
  MIN(c.created_at) as mais_antiga,
  MAX(c.created_at) as mais_recente
FROM calls c
WHERE c.duration >= 30
  AND c.transcription IS NOT NULL
  AND c.transcription != ''
  AND c.id NOT IN (SELECT call_id FROM call_analysis)
  AND c.id NOT IN (SELECT call_id FROM analysis_queue);

-- 4. Verificar chamadas na fila que já têm análise
SELECT 
  'CONFLITO: FILA + ANÁLISE' as info,
  COUNT(*) as quantidade
FROM analysis_queue aq
WHERE aq.call_id IN (SELECT call_id FROM call_analysis);

-- 5. Verificar chamadas com análise mas sem fila
SELECT 
  'ANÁLISE SEM FILA' as info,
  COUNT(*) as quantidade
FROM call_analysis ca
WHERE ca.call_id NOT IN (SELECT call_id FROM analysis_queue);

-- 6. Verificar chamadas recentes (últimos 7 dias)
SELECT 
  'CHAMADAS RECENTES' as info,
  COUNT(*) as quantidade
FROM calls c
WHERE c.created_at >= NOW() - INTERVAL '7 days'
  AND c.duration >= 30
  AND c.transcription IS NOT NULL
  AND c.transcription != '';

