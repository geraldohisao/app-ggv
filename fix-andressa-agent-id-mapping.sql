-- ===================================================================
-- CORREÇÃO DEFINITIVA: Mapear agent_id "Andressa" para sdr_id correto
-- ===================================================================
-- Problema: agent_id "Andressa" não está mapeado para o sdr_id correto
-- Solução: Atualizar calls para usar o sdr_id correto de Andressa Habinoski

-- 1. VERIFICAR SITUAÇÃO ATUAL
SELECT 
  'SITUAÇÃO ATUAL - Andressa' as status,
  c.id as call_id,
  c.agent_id,
  c.sdr_id,
  p.id as profile_id,
  p.full_name as profile_name,
  p.email as profile_email,
  ca.final_grade
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE (
  LOWER(c.agent_id) LIKE '%andressa%' OR
  LOWER(p.full_name) LIKE '%andressa%'
)
AND ca.final_grade IS NOT NULL
ORDER BY ca.final_grade DESC;

-- 2. ENCONTRAR O PROFILE CORRETO DE ANDRESSA
SELECT 
  'PROFILE CORRETO DE ANDRESSA' as info,
  id,
  full_name,
  email
FROM profiles 
WHERE LOWER(full_name) LIKE '%andressa%'
ORDER BY created_at;

-- 3. VERIFICAR CALLS COM agent_id "Andressa" SEM sdr_id CORRETO
SELECT 
  'CALLS COM agent_id Andressa SEM sdr_id CORRETO' as status,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.agent_id = 'Andressa'
  AND (c.sdr_id IS NULL OR c.sdr_id NOT IN (
    SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%andressa%'
  ));

-- 4. ATUALIZAR CALLS COM agent_id "Andressa" PARA USAR O sdr_id CORRETO
-- Primeiro, vamos encontrar o ID correto de Andressa Habinoski
WITH andressa_profile AS (
  SELECT id, full_name, email
  FROM profiles 
  WHERE LOWER(full_name) LIKE '%andressa%'
  ORDER BY created_at
  LIMIT 1
)
UPDATE calls 
SET sdr_id = (SELECT id FROM andressa_profile)
WHERE agent_id = 'Andressa'
  AND (sdr_id IS NULL OR sdr_id NOT IN (
    SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%andressa%'
  ));

-- 5. VERIFICAR SE A ATUALIZAÇÃO FUNCIONOU
SELECT 
  'APÓS ATUALIZAÇÃO - Calls de Andressa' as status,
  c.agent_id,
  c.sdr_id,
  p.full_name as profile_name,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise,
  AVG(ca.final_grade) as nota_media
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id = 'Andressa'
GROUP BY c.agent_id, c.sdr_id, p.full_name;

-- 6. TESTAR A FUNÇÃO DE RANKING APÓS A CORREÇÃO
SELECT 
  'TESTE RANKING APÓS CORREÇÃO' as status,
  sdr_id,
  sdr_name,
  total_calls,
  ROUND(avg_score, 1) as avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

-- 7. VERIFICAR RANKING COMPLETO
SELECT 
  'RANKING FINAL - SEM DUPLICATAS' as status,
  ROW_NUMBER() OVER (ORDER BY avg_score DESC) as posicao,
  sdr_name,
  ROUND(avg_score, 1) as nota_media,
  total_calls as total_ligacoes
FROM get_sdr_metrics_with_analysis(99999)
ORDER BY avg_score DESC
LIMIT 10;

-- 8. VERIFICAR SE HÁ OUTROS CASOS SIMILARES
SELECT 
  'OUTROS CASOS SIMILARES - agent_id vs profile' as status,
  c.agent_id,
  p.full_name,
  COUNT(*) as total_calls
FROM calls c
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id IS NOT NULL 
  AND c.agent_id != ''
  AND p.full_name IS NOT NULL
  AND LOWER(c.agent_id) != LOWER(p.full_name)
  AND LOWER(c.agent_id) = LOWER(SPLIT_PART(p.full_name, ' ', 1))
GROUP BY c.agent_id, p.full_name
ORDER BY total_calls DESC;

SELECT 'Correção aplicada! Andressa deve aparecer apenas uma vez no ranking.' as resultado;
