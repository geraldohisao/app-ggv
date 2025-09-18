-- TESTE 1: Verificar se há dados na tabela calls
SELECT 
  COUNT(*) as total_calls,
  MIN(created_at) as primeira_call,
  MAX(created_at) as ultima_call,
  COUNT(DISTINCT agent_id) as total_sdrs
FROM calls;

-- TESTE 2: Verificar os últimos 5 registros
SELECT 
  id,
  agent_id,
  status,
  status_voip,
  duration,
  created_at
FROM calls
ORDER BY created_at DESC
LIMIT 5;

-- TESTE 3: Testar a função get_dashboard_metrics_v2
SELECT * FROM get_dashboard_metrics_v2(14);

-- TESTE 4: Testar a função get_dashboard_metrics_v2 com período maior
SELECT * FROM get_dashboard_metrics_v2(30);

-- TESTE 5: Testar a função get_calls_with_filters
SELECT 
  COUNT(*) as total_retornado
FROM get_calls_with_filters(
  p_sdr := NULL,
  p_status := NULL,
  p_type := NULL,
  p_start_date := NULL,
  p_end_date := NULL,
  p_limit := 100,
  p_offset := 0,
  p_sort_by := 'created_at',
  p_min_duration := NULL,
  p_max_duration := NULL,
  p_min_score := NULL
);

-- TESTE 6: Ver primeiros registros de get_calls_with_filters
SELECT 
  id,
  agent_id,
  sdr_name,
  status,
  status_voip,
  enterprise,
  duration_seconds,
  created_at
FROM get_calls_with_filters(
  p_sdr := NULL,
  p_status := NULL,
  p_type := NULL,
  p_start_date := NULL,
  p_end_date := NULL,
  p_limit := 5,
  p_offset := 0,
  p_sort_by := 'created_at',
  p_min_duration := NULL,
  p_max_duration := NULL,
  p_min_score := NULL
);

-- TESTE 7: Verificar se há dados nos últimos 14 dias
SELECT 
  COUNT(*) as calls_ultimos_14_dias,
  COUNT(*) FILTER (WHERE status_voip = 'normal_clearing') as atendidas_14_dias
FROM calls
WHERE created_at >= now() - interval '14 days'
  AND created_at <= now();

-- TESTE 8: Verificar distribuição de datas
SELECT 
  DATE(created_at) as data,
  COUNT(*) as total_calls
FROM calls
GROUP BY DATE(created_at)
ORDER BY data DESC
LIMIT 10;

