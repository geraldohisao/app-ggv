-- ===================================================================
-- CORREÇÃO FINAL: Eliminar duplicação de Andressa
-- ===================================================================
-- Problema: Andressa aparece duas vezes (#4 e #7) com scores diferentes
-- Solução: Identificar e consolidar as duas entradas

-- 1. INVESTIGAR AS DUAS ANDRESSA
SELECT 
  'INVESTIGAÇÃO - Duas Andressa' as info,
  c.agent_id,
  c.sdr_id,
  p.id as profile_id,
  p.full_name as profile_name,
  p.email as profile_email,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise,
  AVG(ca.final_grade) as nota_media,
  MIN(c.created_at) as primeira_call,
  MAX(c.created_at) as ultima_call
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE (
  LOWER(c.agent_id) LIKE '%andressa%' OR
  LOWER(p.full_name) LIKE '%andressa%'
)
GROUP BY c.agent_id, c.sdr_id, p.id, p.full_name, p.email
ORDER BY nota_media DESC;

-- 2. VERIFICAR FUNÇÕES ATUAIS
SELECT 
  'FUNÇÃO get_sdr_metrics - Andressa' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY total_calls DESC;

SELECT 
  'FUNÇÃO get_sdr_metrics_with_analysis - Andressa' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

-- 3. IDENTIFICAR QUAL ANDRESSA É A CORRETA
-- Vamos usar a que tem mais calls ou o profile mais recente
WITH andressa_candidates AS (
  SELECT 
    c.sdr_id,
    p.full_name,
    p.email,
    COUNT(*) as total_calls,
    COUNT(ca.call_id) as calls_com_analise,
    AVG(ca.final_grade) as nota_media
  FROM calls c
  LEFT JOIN call_analysis ca ON c.id = ca.call_id
  LEFT JOIN profiles p ON p.id = c.sdr_id
  WHERE LOWER(p.full_name) LIKE '%andressa%'
  GROUP BY c.sdr_id, p.full_name, p.email
  ORDER BY total_calls DESC
),
correct_andressa AS (
  SELECT sdr_id, full_name, email
  FROM andressa_candidates
  LIMIT 1
)
-- 4. ATUALIZAR TODAS AS CALLS DE ANDRESSA PARA USAR O SDR_ID CORRETO
UPDATE calls 
SET sdr_id = (SELECT sdr_id FROM correct_andressa)
WHERE agent_id = 'Andressa' 
  AND sdr_id IS NOT NULL
  AND sdr_id NOT IN (SELECT sdr_id FROM correct_andressa);

-- 5. VERIFICAR SE A CONSOLIDAÇÃO FUNCIONOU
SELECT 
  'APÓS CONSOLIDAÇÃO - Andressa' as info,
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

-- 6. TESTAR AS FUNÇÕES APÓS CONSOLIDAÇÃO
SELECT 
  'TESTE FINAL - get_sdr_metrics' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%';

SELECT 
  'TESTE FINAL - get_sdr_metrics_with_analysis' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%';

-- 7. VERIFICAR RANKING COMPLETO
SELECT 
  'RANKING FINAL - SEM DUPLICATAS' as status,
  ROW_NUMBER() OVER (ORDER BY avg_score DESC) as posicao,
  sdr_name,
  ROUND(avg_score, 1) as nota_media,
  total_calls as total_ligacoes,
  answered_calls as atendidas,
  ROUND((answered_calls::NUMERIC / NULLIF(total_calls, 0)) * 100, 0) as taxa_atendimento
FROM get_sdr_metrics_with_analysis(99999)
ORDER BY avg_score DESC
LIMIT 10;

-- 8. VERIFICAR SE HÁ OUTROS CASOS SIMILARES
SELECT 
  'OUTROS CASOS SIMILARES' as status,
  sdr_name,
  COUNT(*) as entradas_duplicadas
FROM get_sdr_metrics_with_analysis(99999)
GROUP BY sdr_name
HAVING COUNT(*) > 1
ORDER BY entradas_duplicadas DESC;

SELECT 'Consolidação de Andressa aplicada! Deve aparecer apenas uma vez no ranking.' as resultado;
