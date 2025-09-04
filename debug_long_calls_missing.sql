-- Debug: Por que chamadas longas não aparecem na busca?
-- Investigar diferenças entre dados brutos e função get_calls_with_filters

-- 1. Verificar chamadas mais longas na tabela
SELECT 'CHAMADAS MAIS LONGAS NA TABELA:' as info;
SELECT 
  id,
  duration,
  duration_formated,
  sdr_name,
  person,
  call_type,
  status_voip,
  created_at,
  recording_url IS NOT NULL as tem_recording_url,
  transcription IS NOT NULL as tem_transcricao,
  LENGTH(transcription) as transcricao_length
FROM calls 
WHERE duration > 0
ORDER BY duration DESC 
LIMIT 10;

-- 2. Verificar se get_calls_with_filters existe e funciona
SELECT 'TESTANDO FUNÇÃO get_calls_with_filters:' as info;

-- Testar sem filtros
SELECT 
  COUNT(*) as total_calls_function,
  MAX(duration) as max_duration_function,
  MIN(duration) as min_duration_function,
  AVG(duration) as avg_duration_function
FROM get_calls_with_filters(
  NULL, -- p_sdr_email
  NULL, -- p_status  
  NULL, -- p_call_type
  NULL, -- p_start_date
  NULL, -- p_end_date
  1000, -- p_limit
  0     -- p_offset
);

-- 3. Comparar dados diretos vs função
SELECT 'COMPARAÇÃO DIRETA vs FUNÇÃO:' as info;

-- Dados diretos
WITH direct_data AS (
  SELECT 
    COUNT(*) as total_direct,
    MAX(duration) as max_duration_direct,
    COUNT(CASE WHEN duration > 300 THEN 1 END) as long_calls_direct
  FROM calls
),
-- Dados da função
function_data AS (
  SELECT 
    COUNT(*) as total_function,
    MAX(duration) as max_duration_function,
    COUNT(CASE WHEN duration > 300 THEN 1 END) as long_calls_function
  FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
)
SELECT 
  d.total_direct,
  f.total_function,
  d.max_duration_direct,
  f.max_duration_function,
  d.long_calls_direct,
  f.long_calls_function,
  CASE 
    WHEN d.total_direct != f.total_function THEN 'DIFERENÇA NO TOTAL'
    WHEN d.max_duration_direct != f.max_duration_function THEN 'DIFERENÇA NA DURAÇÃO MÁXIMA'
    WHEN d.long_calls_direct != f.long_calls_function THEN 'DIFERENÇA EM CHAMADAS LONGAS'
    ELSE 'DADOS CONSISTENTES'
  END as status
FROM direct_data d, function_data f;

-- 4. Verificar filtros que podem estar escondendo dados
SELECT 'VERIFICANDO FILTROS NA FUNÇÃO:' as info;

-- Testar chamadas longas especificamente
SELECT 
  id,
  duration,
  sdr_name,
  agent_id,
  status_voip,
  created_at
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
WHERE duration > 300
ORDER BY duration DESC
LIMIT 5;

-- 5. Verificar se há problemas com agent_id
SELECT 'VERIFICANDO AGENT_ID:' as info;
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN agent_id IS NOT NULL THEN 1 END) as with_agent_id,
  COUNT(CASE WHEN agent_id IS NULL THEN 1 END) as without_agent_id,
  COUNT(CASE WHEN duration > 300 AND agent_id IS NULL THEN 1 END) as long_calls_no_agent_id
FROM calls;

-- 6. Verificar se a função tem filtros implícitos
SELECT 'POSSÍVEL CAUSA - FILTROS IMPLÍCITOS:' as info;
SELECT 
  'Chamadas longas sem agent_id' as problema,
  COUNT(*) as quantidade
FROM calls 
WHERE duration > 300 AND agent_id IS NULL;

SELECT 
  'Chamadas longas com agent_id' as problema,
  COUNT(*) as quantidade
FROM calls 
WHERE duration > 300 AND agent_id IS NOT NULL;
