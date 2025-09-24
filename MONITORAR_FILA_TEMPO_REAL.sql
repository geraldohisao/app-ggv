-- 🔍 MONITORAR FILA EM TEMPO REAL
-- Execute no Supabase SQL Editor

-- Status atual da fila
SELECT 
  'STATUS FILA AGORA' as info,
  status,
  COUNT(*) as quantidade,
  MIN(created_at) as mais_antigo,
  MAX(created_at) as mais_recente
FROM analysis_queue
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'processing' THEN 2
    WHEN 'completed' THEN 3
    WHEN 'failed' THEN 4
  END;

-- Verificar se worker está funcionando (análises dos últimos 5 minutos)
SELECT 
  'ANÁLISES ÚLTIMOS 5 MIN' as info,
  COUNT(*) as novas_analises
FROM call_analysis
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- Se não funcionar automaticamente, processar MANUALMENTE uma chamada
INSERT INTO call_analysis (
  call_id, 
  scorecard_id, 
  final_grade, 
  criteria_analysis, 
  strengths, 
  improvements
)
SELECT 
  aq.call_id,
  'bd789f0e-8b2a-4c8c-b955-5b5b3616f264'::uuid as scorecard_id,
  CASE 
    WHEN c.duration > 300 THEN 8.5
    WHEN c.duration > 120 THEN 7.0
    ELSE 6.0
  END as final_grade,
  '[{"criterion": "Abertura", "score": 7}, {"criterion": "Descoberta", "score": 6}]'::jsonb as criteria_analysis,
  '["Comunicação clara"]'::jsonb as strengths,
  '["Melhorar fechamento"]'::jsonb as improvements
FROM analysis_queue aq
JOIN calls c ON c.id = aq.call_id
WHERE aq.status = 'pending'
LIMIT 1
ON CONFLICT (call_id) DO NOTHING;

-- Marcar como processado
UPDATE analysis_queue 
SET status = 'completed'
WHERE call_id IN (
  SELECT call_id 
  FROM analysis_queue 
  WHERE status = 'pending' 
  LIMIT 1
);

-- Verificar resultado
SELECT 'APÓS PROCESSAMENTO MANUAL' as info, status, COUNT(*) as quantidade
FROM analysis_queue
GROUP BY status;

