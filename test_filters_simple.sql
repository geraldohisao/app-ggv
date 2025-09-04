-- Teste simples dos filtros
-- Verificar se a função está funcionando corretamente

-- 1. Teste básico sem filtros
SELECT 'Teste 1: Sem filtros' as teste;
SELECT COUNT(*) as total FROM get_calls_with_filters();

-- 2. Teste com duração mínima
SELECT 'Teste 2: Duração mínima 60s' as teste;
SELECT COUNT(*) as total FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  100, 0, 
  60, NULL, 
  'created_at'
);

-- 3. Teste ordenação por duração
SELECT 'Teste 3: Ordenação por duração' as teste;
SELECT 
  id,
  duration,
  duration_formated,
  sdr_name
FROM get_calls_with_filters(
  NULL, NULL, NULL, NULL, NULL, 
  5, 0, 
  NULL, NULL, 
  'duration'
)
ORDER BY duration DESC;

-- 4. Verificar se há dados
SELECT 'Verificação de dados' as info;
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN duration > 60 THEN 1 END) as calls_over_60s,
  MAX(duration) as max_duration
FROM calls;
