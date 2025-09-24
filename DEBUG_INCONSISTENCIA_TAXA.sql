-- 🔍 DEBUG: Por que dashboard (20%) vs gráfico (22%) são diferentes?
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. CALCULAR TAXA REAL - TODAS AS CHAMADAS (DASHBOARD)
-- ===============================================================

SELECT 
  'TAXA REAL - TODAS AS CHAMADAS' as fonte,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  ROUND(
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1
  ) as taxa_atendimento_real
FROM calls;

-- ===============================================================
-- 2. CALCULAR TAXA - ÚLTIMOS 30 DIAS (GRÁFICO)
-- ===============================================================

SELECT 
  'TAXA REAL - ÚLTIMOS 30 DIAS' as fonte,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  ROUND(
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1
  ) as taxa_atendimento_real
FROM calls
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ===============================================================
-- 3. TESTAR get_dashboard_totals (FONTE DO DASHBOARD)
-- ===============================================================

SELECT 
  'FONTE get_dashboard_totals' as fonte,
  total_calls,
  answered_calls,
  ROUND(answered_calls * 100.0 / total_calls, 1) as taxa_calculada,
  avg_duration_answered
FROM get_dashboard_totals();

-- ===============================================================
-- 4. TESTAR get_calls_volume_by_day AGREGADO (FONTE DO GRÁFICO)
-- ===============================================================

WITH volume_data AS (
  SELECT 
    day,
    total,
    answered
  FROM get_calls_volume_by_day(
    (NOW() - INTERVAL '30 days')::timestamptz,
    NOW()::timestamptz,
    NULL
  )
)
SELECT 
  'FONTE get_calls_volume_by_day' as fonte,
  SUM(total) as total_chamadas,
  SUM(answered) as atendidas,
  ROUND(SUM(answered) * 100.0 / SUM(total), 1) as taxa_calculada,
  COUNT(*) as dias_com_dados
FROM volume_data;

-- ===============================================================
-- 5. COMPARAR PERÍODOS ESPECÍFICOS
-- ===============================================================

SELECT 
  'COMPARAÇÃO POR PERÍODO' as info,
  periodo,
  total_chamadas,
  atendidas,
  taxa_pct
FROM (
  -- Todas as chamadas
  SELECT 
    'TODAS (histórico)' as periodo,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_pct
  FROM calls
  
  UNION ALL
  
  -- Últimos 30 dias
  SELECT 
    'ÚLTIMOS 30 DIAS' as periodo,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_pct
  FROM calls
  WHERE created_at >= NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Setembro 2025 completo
  SELECT 
    'SETEMBRO 2025' as periodo,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_pct
  FROM calls
  WHERE EXTRACT(YEAR FROM created_at) = 2025 
    AND EXTRACT(MONTH FROM created_at) = 9
) subquery
ORDER BY 
  CASE periodo
    WHEN 'TODAS (histórico)' THEN 1
    WHEN 'ÚLTIMOS 30 DIAS' THEN 2
    WHEN 'SETEMBRO 2025' THEN 3
  END;

-- ===============================================================
-- 6. VERIFICAR SE HÁ DADOS FORA DE SETEMBRO
-- ===============================================================

SELECT 
  'DADOS FORA DE SETEMBRO' as info,
  EXTRACT(YEAR FROM created_at) as ano,
  EXTRACT(MONTH FROM created_at) as mes,
  COUNT(*) as chamadas,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa
FROM calls
WHERE NOT (EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9)
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
ORDER BY ano, mes;

