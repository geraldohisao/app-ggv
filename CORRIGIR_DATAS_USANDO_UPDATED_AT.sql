-- 🔧 CORRIGIR DATAS USANDO UPDATED_AT COMO REFERÊNCIA
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. ANÁLISE ANTES DA CORREÇÃO
-- ===============================================================

SELECT 
  'ANTES DA CORREÇÃO' as status,
  EXTRACT(YEAR FROM created_at) as ano_created,
  EXTRACT(YEAR FROM updated_at) as ano_updated,
  COUNT(*) as quantidade
FROM calls
WHERE updated_at IS NOT NULL
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(YEAR FROM updated_at)
ORDER BY ano_created, ano_updated;

-- ===============================================================
-- 2. CORRIGIR CREATED_AT BASEADO NO UPDATED_AT (DADOS REAIS)
-- ===============================================================

-- Para chamadas onde updated_at está em setembro 2025, 
-- usar updated_at como created_at (data real da chamada)
UPDATE calls 
SET created_at = updated_at
WHERE updated_at IS NOT NULL
  AND EXTRACT(YEAR FROM updated_at) = 2025
  AND EXTRACT(MONTH FROM updated_at) = 9
  AND EXTRACT(YEAR FROM created_at) = 2024; -- Só corrigir as que estão erradas

-- ===============================================================
-- 3. VERIFICAR RESULTADO DA CORREÇÃO
-- ===============================================================

SELECT 
  'APÓS CORREÇÃO' as status,
  EXTRACT(YEAR FROM created_at) as ano_created,
  EXTRACT(MONTH FROM created_at) as mes_created,
  to_char(created_at, 'YYYY-MM') as ano_mes,
  COUNT(*) as quantidade,
  MIN(created_at) as primeira_chamada,
  MAX(created_at) as ultima_chamada
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'YYYY-MM')
ORDER BY ano_created, mes_created;

-- ===============================================================
-- 4. VERIFICAR PERÍODO 17/09 a 23/09 APÓS CORREÇÃO
-- ===============================================================

SELECT 
  'PERÍODO 17/09 a 23/09 CORRIGIDO' as info,
  DATE(created_at) as data,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_atendimento
FROM calls 
WHERE created_at >= '2025-09-17 00:00:00'::timestamptz
  AND created_at <= '2025-09-23 23:59:59'::timestamptz
GROUP BY DATE(created_at)
ORDER BY data;

-- ===============================================================
-- 5. TOTAL GERAL APÓS CORREÇÃO
-- ===============================================================

SELECT 
  'TOTAIS FINAIS' as info,
  COUNT(*) as total_geral,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as total_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN 1 END) as restantes_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9 THEN 1 END) as setembro_2025,
  ROUND(COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_setembro_2025
FROM calls;

