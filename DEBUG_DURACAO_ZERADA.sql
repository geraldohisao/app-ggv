-- 🔍 DEBUG: Por que duração média está zerada?
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR CAMPO DURATION NAS CHAMADAS ATENDIDAS
-- ===============================================================

SELECT 
  'ANÁLISE CAMPO DURATION' as info,
  COUNT(*) as total_atendidas,
  COUNT(CASE WHEN duration IS NOT NULL THEN 1 END) as com_duration_nao_nulo,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duration_positivo,
  AVG(duration) as media_duration_segundos,
  MIN(duration) as min_duration,
  MAX(duration) as max_duration,
  -- Verificar se duration_formated existe e é diferente
  COUNT(CASE WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN 1 END) as com_duration_formated
FROM calls
WHERE status_voip = 'normal_clearing'; -- Apenas atendidas

-- ===============================================================
-- 2. SAMPLE DE CHAMADAS ATENDIDAS COM DURAÇÕES
-- ===============================================================

SELECT 
  'SAMPLE CHAMADAS ATENDIDAS' as info,
  agent_id,
  duration,
  duration_formated,
  CASE 
    WHEN duration > 0 THEN duration
    WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
      -- Converter duration_formated para segundos
      EXTRACT(EPOCH FROM duration_formated::interval)
    ELSE 0
  END as duracao_calculada_segundos
FROM calls
WHERE status_voip = 'normal_clearing'
  AND (duration > 0 OR (duration_formated IS NOT NULL AND duration_formated != '00:00:00'))
ORDER BY agent_id, duration DESC
LIMIT 20;

-- ===============================================================
-- 3. VERIFICAR POR SDR - DURAÇÃO DAS ATENDIDAS
-- ===============================================================

SELECT 
  'DURAÇÃO POR SDR (APENAS ATENDIDAS)' as info,
  agent_id as sdr,
  COUNT(*) as total_atendidas,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duration_positivo,
  AVG(duration) as media_duration_segundos,
  AVG(duration) / 60 as media_duration_minutos,
  MIN(duration) as min_duration,
  MAX(duration) as max_duration
FROM calls
WHERE status_voip = 'normal_clearing' -- Apenas atendidas
GROUP BY agent_id
HAVING COUNT(*) > 5  -- Só SDRs com mais de 5 atendidas
ORDER BY total_atendidas DESC;

-- ===============================================================
-- 4. TESTAR FUNÇÃO CORRIGIDA (USAR DURATION_FORMATED SE DURATION = 0)
-- ===============================================================

SELECT 
  'TESTE FUNÇÃO CORRIGIDA' as info,
  agent_id as sdr,
  COUNT(*) as total_atendidas,
  -- Média usando duration OU duration_formated
  AVG(
    CASE 
      WHEN duration > 0 THEN duration
      WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
        EXTRACT(EPOCH FROM duration_formated::interval)::integer
      ELSE 0
    END
  ) as media_duracao_inteligente_segundos,
  -- Converter para minutos
  ROUND(AVG(
    CASE 
      WHEN duration > 0 THEN duration
      WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
        EXTRACT(EPOCH FROM duration_formated::interval)::integer
      ELSE 0
    END
  ) / 60) as media_duracao_minutos
FROM calls
WHERE status_voip = 'normal_clearing' -- Apenas atendidas
GROUP BY agent_id
HAVING COUNT(*) > 5
ORDER BY total_atendidas DESC;

