-- 🔍 ONDE ESTÃO AS 2240 CHAMADAS RESTANTES?
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. DISTRIBUIÇÃO COMPLETA POR ANO/MÊS (CREATED_AT)
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO CREATED_AT' as fonte,
  EXTRACT(YEAR FROM created_at) as ano,
  EXTRACT(MONTH FROM created_at) as mes,
  to_char(created_at, 'YYYY-MM') as ano_mes,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls), 1) as percentual,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'YYYY-MM')
ORDER BY ano, mes;

-- ===============================================================
-- 2. DISTRIBUIÇÃO COMPLETA POR ANO/MÊS (UPDATED_AT)
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO UPDATED_AT' as fonte,
  EXTRACT(YEAR FROM updated_at) as ano,
  EXTRACT(MONTH FROM updated_at) as mes,
  to_char(updated_at, 'YYYY-MM') as ano_mes,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls WHERE updated_at IS NOT NULL), 1) as percentual,
  MIN(updated_at) as primeira,
  MAX(updated_at) as ultima
FROM calls
WHERE updated_at IS NOT NULL
GROUP BY EXTRACT(YEAR FROM updated_at), EXTRACT(MONTH FROM updated_at), to_char(updated_at, 'YYYY-MM')
ORDER BY ano, mes;

-- ===============================================================
-- 3. ANÁLISE DAS CHAMADAS SEM UPDATED_AT
-- ===============================================================

SELECT 
  'CHAMADAS SEM UPDATED_AT' as info,
  COUNT(*) as total_sem_updated,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls), 1) as pct_sem_updated,
  MIN(created_at) as primeira_sem_updated,
  MAX(created_at) as ultima_sem_updated,
  COUNT(DISTINCT agent_id) as diferentes_sdrs,
  string_agg(DISTINCT agent_id, ', ') as sdrs_sem_updated
FROM calls
WHERE updated_at IS NULL;

-- ===============================================================
-- 4. COMPARAÇÃO LADO A LADO: TODAS AS COMBINAÇÕES
-- ===============================================================

SELECT 
  'MATRIZ CREATED vs UPDATED' as info,
  to_char(created_at, 'YYYY-MM') as created_ano_mes,
  CASE 
    WHEN updated_at IS NULL THEN 'SEM UPDATED_AT'
    ELSE to_char(updated_at, 'YYYY-MM')
  END as updated_ano_mes,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls), 1) as pct_total
FROM calls
GROUP BY to_char(created_at, 'YYYY-MM'), 
         CASE 
           WHEN updated_at IS NULL THEN 'SEM UPDATED_AT'
           ELSE to_char(updated_at, 'YYYY-MM')
         END
ORDER BY created_ano_mes, updated_ano_mes;

-- ===============================================================
-- 5. VERIFICAR SE HÁ OUTROS ANOS/MESES ESCONDIDOS
-- ===============================================================

SELECT 
  'TODOS OS ANOS PRESENTES' as info,
  'CREATED_AT' as campo,
  EXTRACT(YEAR FROM created_at) as ano,
  COUNT(*) as quantidade,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at)

UNION ALL

SELECT 
  'TODOS OS ANOS PRESENTES' as info,
  'UPDATED_AT' as campo,
  EXTRACT(YEAR FROM updated_at) as ano,
  COUNT(*) as quantidade,
  MIN(updated_at) as primeira,
  MAX(updated_at) as ultima
FROM calls
WHERE updated_at IS NOT NULL
GROUP BY EXTRACT(YEAR FROM updated_at)

ORDER BY campo, ano;

-- ===============================================================
-- 6. SAMPLE DAS CHAMADAS QUE NÃO SÃO DE SETEMBRO 2025
-- ===============================================================

SELECT 
  'SAMPLE CHAMADAS FORA DE SETEMBRO 2025' as info,
  id,
  created_at,
  updated_at,
  agent_id,
  deal_id,
  status,
  status_voip,
  -- Classificar onde cada chamada se encaixa
  CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND (updated_at IS NULL OR EXTRACT(YEAR FROM updated_at) = 2024) THEN 'DADOS_ANTIGOS_2024'
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(YEAR FROM updated_at) = 2025 THEN 'DADOS_2024_ATUALIZADOS_2025'
    WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) != 9 THEN 'DADOS_2025_FORA_SETEMBRO'
    ELSE 'OUTROS'
  END as categoria
FROM calls
WHERE NOT (
  EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9
)
ORDER BY created_at DESC
LIMIT 30;

