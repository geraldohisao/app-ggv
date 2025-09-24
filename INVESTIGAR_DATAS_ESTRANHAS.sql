-- 🔍 INVESTIGAR DATAS ESTRANHAS NA TABELA CALLS
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR DISTRIBUIÇÃO DE DATAS
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO POR ANO/MÊS' as info,
  EXTRACT(YEAR FROM created_at) as ano,
  EXTRACT(MONTH FROM created_at) as mes,
  to_char(created_at, 'YYYY-MM') as ano_mes,
  COUNT(*) as quantidade_chamadas,
  MIN(created_at) as primeira_chamada,
  MAX(created_at) as ultima_chamada
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'YYYY-MM')
ORDER BY ano, mes;

-- ===============================================================
-- 2. VERIFICAR CHAMADAS DE 2024 vs 2025
-- ===============================================================

SELECT 
  'COMPARAÇÃO 2024 vs 2025' as info,
  CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN '2024'
    WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN '2025'
    ELSE 'OUTROS'
  END as ano,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls), 1) as percentual,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN '2024'
    WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN '2025'
    ELSE 'OUTROS'
  END
ORDER BY ano;

-- ===============================================================
-- 3. VERIFICAR DIFERENÇA ENTRE CREATED_AT E UPDATED_AT
-- ===============================================================

SELECT 
  'ANÁLISE CREATED_AT vs UPDATED_AT' as info,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN created_at = updated_at THEN 1 END) as created_igual_updated,
  COUNT(CASE WHEN created_at != updated_at THEN 1 END) as created_diferente_updated,
  COUNT(CASE WHEN updated_at IS NULL THEN 1 END) as updated_at_nulo,
  ROUND(COUNT(CASE WHEN created_at = updated_at THEN 1 END) * 100.0 / COUNT(*), 1) as pct_iguais
FROM calls;

-- ===============================================================
-- 4. SAMPLE DE CHAMADAS COM DATAS SUSPEITAS
-- ===============================================================

SELECT 
  'SAMPLE CHAMADAS 2024' as info,
  id,
  created_at,
  updated_at,
  agent_id,
  status_voip,
  deal_id,
  EXTRACT(YEAR FROM created_at) as ano,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_formatado,
  to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_formatado
FROM calls
WHERE EXTRACT(YEAR FROM created_at) = 2024
ORDER BY created_at DESC
LIMIT 10;

-- ===============================================================
-- 5. CHAMADAS DE SETEMBRO 2025 (ESPERADAS)
-- ===============================================================

SELECT 
  'CHAMADAS SETEMBRO 2025' as info,
  COUNT(*) as total_setembro_2025,
  MIN(created_at) as primeira_setembro,
  MAX(created_at) as ultima_setembro,
  COUNT(DISTINCT agent_id) as sdrs_ativos_setembro
FROM calls
WHERE EXTRACT(YEAR FROM created_at) = 2025 
  AND EXTRACT(MONTH FROM created_at) = 9;

-- ===============================================================
-- 6. VERIFICAR SE HÁ PADRÃO NAS DATAS ESTRANHAS
-- ===============================================================

SELECT 
  'PADRÃO DATAS 2024' as info,
  DATE(created_at) as data_chamada,
  COUNT(*) as quantidade,
  COUNT(DISTINCT agent_id) as diferentes_sdrs,
  string_agg(DISTINCT agent_id, ', ' ORDER BY agent_id) as sdrs_listados
FROM calls
WHERE EXTRACT(YEAR FROM created_at) = 2024
GROUP BY DATE(created_at)
ORDER BY data_chamada;

-- ===============================================================
-- 7. TOTAL GERAL PARA CONTEXTO
-- ===============================================================

SELECT 
  'RESUMO GERAL' as info,
  COUNT(*) as total_geral,
  (SELECT COUNT(*) FROM calls WHERE EXTRACT(YEAR FROM created_at) = 2024) as total_2024,
  (SELECT COUNT(*) FROM calls WHERE EXTRACT(YEAR FROM created_at) = 2025) as total_2025,
  (SELECT COUNT(*) FROM calls WHERE EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9) as setembro_2025
FROM calls;

