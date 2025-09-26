-- ===================================================================
-- DEBUG: Investigar problemas no ranking
-- ===================================================================

-- 1. VERIFICAR DADOS BRUTOS DE ANDRESSA
SELECT 
  'DADOS BRUTOS - Andressa' as info,
  c.id as call_id,
  c.agent_id,
  c.sdr_id,
  p.id as profile_id,
  p.full_name as profile_name,
  p.email as profile_email,
  c.status_voip,
  c.duration,
  ca.final_grade,
  c.created_at
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE (
  LOWER(c.agent_id) LIKE '%andressa%' OR
  LOWER(p.full_name) LIKE '%andressa%' OR
  LOWER(COALESCE(c.insights->>'sdr_name', '')) LIKE '%andressa%'
)
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. VERIFICAR SE HÁ DUAS ANDRESSA DIFERENTES
SELECT 
  'VERIFICAÇÃO - Duas Andressa diferentes?' as info,
  c.agent_id,
  c.sdr_id,
  p.full_name as profile_name,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise,
  AVG(ca.final_grade) as nota_media
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE (
  LOWER(c.agent_id) LIKE '%andressa%' OR
  LOWER(p.full_name) LIKE '%andressa%'
)
GROUP BY c.agent_id, c.sdr_id, p.full_name
ORDER BY nota_media DESC;

-- 3. VERIFICAR FUNÇÃO ATUAL
SELECT 
  'FUNÇÃO ATUAL - get_sdr_metrics_with_analysis' as info,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

-- 4. VERIFICAR FUNÇÃO get_sdr_metrics (totais)
SELECT 
  'FUNÇÃO TOTAIS - get_sdr_metrics' as info,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY total_calls DESC;

-- 5. VERIFICAR SE EXISTE FUNÇÃO get_sdr_metrics
SELECT 
  'VERIFICAR FUNÇÃO get_sdr_metrics' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_sdr_metrics'
AND routine_schema = 'public';

-- 6. CONTAR CALLS POR SDR IDENTIFICADO
SELECT 
  'CONTAGEM POR SDR' as info,
  COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing') as answered_calls,
  COUNT(ca.call_id) as calls_com_analise,
  AVG(ca.final_grade) as nota_media
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.created_at >= NOW() - INTERVAL '1 year'
GROUP BY COALESCE(c.agent_id, c.sdr_id::TEXT)
HAVING COUNT(*) > 0
ORDER BY total_calls DESC
LIMIT 10;

-- 7. VERIFICAR PROFILES DE ANDRESSA
SELECT 
  'PROFILES DE ANDRESSA' as info,
  id,
  full_name,
  email,
  created_at
FROM profiles 
WHERE LOWER(full_name) LIKE '%andressa%'
ORDER BY created_at;

-- 8. VERIFICAR SE HÁ CALLS COM SDR_ID NULL
SELECT 
  'CALLS COM SDR_ID NULL' as info,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE agent_id = 'Andressa') as calls_andressa
FROM calls 
WHERE sdr_id IS NULL
AND created_at >= NOW() - INTERVAL '1 year';
