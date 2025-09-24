-- 🔍 DEBUG DETALHADO: 20% vs 23% inconsistência
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. CÁLCULO DIRETO NA TABELA (FONTE ÚNICA)
-- ===============================================================

SELECT 
  'CÁLCULO DIRETO TABELA CALLS' as fonte,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  COUNT(CASE WHEN status_voip != 'normal_clearing' OR status_voip IS NULL THEN 1 END) as nao_atendidas,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 2) as taxa_exata,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 0) as taxa_arredondada
FROM calls;

-- ===============================================================
-- 2. TESTAR get_dashboard_totals (DASHBOARD)
-- ===============================================================

SELECT 
  'get_dashboard_totals (DASHBOARD)' as fonte,
  total_calls,
  answered_calls,
  total_calls - answered_calls as nao_atendidas,
  ROUND(answered_calls * 100.0 / total_calls, 2) as taxa_exata,
  ROUND(answered_calls * 100.0 / total_calls, 0) as taxa_arredondada
FROM get_dashboard_totals();

-- ===============================================================
-- 3. TESTAR get_calls_volume_by_day AGREGADO (GRÁFICO)
-- ===============================================================

WITH all_days AS (
  SELECT 
    day,
    total,
    answered
  FROM get_calls_volume_by_day(
    '2025-09-01'::timestamptz,  -- Desde o início de setembro
    '2025-12-31'::timestamptz,  -- Até o fim do ano
    NULL                        -- Todos os SDRs
  )
)
SELECT 
  'get_calls_volume_by_day (GRÁFICO)' as fonte,
  SUM(total) as total_chamadas,
  SUM(answered) as atendidas,
  SUM(total) - SUM(answered) as nao_atendidas,
  ROUND(SUM(answered) * 100.0 / SUM(total), 2) as taxa_exata,
  ROUND(SUM(answered) * 100.0 / SUM(total), 0) as taxa_arredondada,
  COUNT(*) as dias_com_dados
FROM all_days;

-- ===============================================================
-- 4. COMPARAR STATUS_VOIP (VERIFICAR CRITÉRIOS)
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO STATUS_VOIP' as info,
  status_voip,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls), 1) as percentual,
  CASE 
    WHEN status_voip = 'normal_clearing' THEN 'CONSIDERADO ATENDIDA'
    ELSE 'CONSIDERADO NÃO ATENDIDA'
  END as classificacao
FROM calls
WHERE status_voip IS NOT NULL
GROUP BY status_voip
ORDER BY quantidade DESC;

-- ===============================================================
-- 5. VERIFICAR SE get_calls_volume_by_day USA CRITÉRIO DIFERENTE
-- ===============================================================

-- Buscar definição da função
SELECT 
  'DEFINIÇÃO get_calls_volume_by_day' as info,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_calls_volume_by_day';

-- ===============================================================
-- 6. VERIFICAR SE get_dashboard_totals USA CRITÉRIO DIFERENTE
-- ===============================================================

-- Buscar definição da função
SELECT 
  'DEFINIÇÃO get_dashboard_totals' as info,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_dashboard_totals';

-- ===============================================================
-- 7. TESTE FINAL - MESMO PERÍODO PARA AMBAS
-- ===============================================================

-- Dashboard
SELECT 
  'DASHBOARD - TODAS AS CHAMADAS' as teste,
  total_calls,
  answered_calls,
  ROUND(answered_calls * 100.0 / total_calls, 1) as taxa
FROM get_dashboard_totals()

UNION ALL

-- Gráfico - período amplo
SELECT 
  'GRÁFICO - PERÍODO AMPLO' as teste,
  SUM(total)::bigint as total_calls,
  SUM(answered)::bigint as answered_calls,
  ROUND(SUM(answered) * 100.0 / SUM(total), 1) as taxa
FROM get_calls_volume_by_day(
  '2020-01-01'::timestamptz,  -- Desde muito antes
  '2030-12-31'::timestamptz,  -- Até muito depois
  NULL                        -- Todos os SDRs
);

