-- 🔍 VERIFICAR SE WORKER ESTÁ PROCESSANDO
-- Execute no Supabase SQL Editor (aguarde 30 segundos após iniciar worker)

-- Verificar se status mudou de 'pending' para 'processing' ou 'completed'
SELECT 
  'STATUS ATUAL DA FILA' as info,
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

-- Verificar se novas análises foram criadas
SELECT 
  'ANÁLISES RECENTES' as info,
  COUNT(*) as total_analises_ultima_hora,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '10 minutes' THEN 1 END) as ultimos_10_min,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '5 minutes' THEN 1 END) as ultimos_5_min
FROM call_analysis
WHERE created_at >= NOW() - INTERVAL '1 hour';

