-- Debug: Investigar formato real da duração
-- Descobrir por que duration mostra valores baixos

-- 1. Verificar dados reais de duration vs duration_formated
SELECT 'COMPARAÇÃO DURATION vs DURATION_FORMATED:' as info;
SELECT 
  id,
  duration,
  duration_formated,
  CASE 
    WHEN duration_formated IS NOT NULL THEN 
      -- Tentar extrair segundos do formato HH:MM:SS
      EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER
    ELSE duration 
  END as duration_in_seconds,
  sdr_name,
  created_at
FROM calls 
WHERE duration_formated IS NOT NULL
ORDER BY 
  CASE 
    WHEN duration_formated IS NOT NULL THEN 
      EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER
    ELSE duration 
  END DESC
LIMIT 10;

-- 2. Verificar se duration_formated tem valores mais altos
SELECT 'ANÁLISE DE DURATION_FORMATED:' as info;
SELECT 
  duration_formated,
  COUNT(*) as quantidade,
  -- Converter para segundos
  EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER as segundos
FROM calls 
WHERE duration_formated IS NOT NULL 
  AND duration_formated != '00:00:00'
GROUP BY duration_formated
ORDER BY segundos DESC
LIMIT 10;

-- 3. Verificar chamadas que deveriam ser longas
SELECT 'CHAMADAS POTENCIALMENTE LONGAS:' as info;
SELECT 
  id,
  duration,
  duration_formated,
  EXTRACT(EPOCH FROM COALESCE(duration_formated::TIME, '00:00:00'::TIME))::INTEGER as segundos_calculados,
  sdr_name,
  person,
  transcription IS NOT NULL as tem_transcricao,
  LENGTH(transcription) as tamanho_transcricao
FROM calls 
WHERE 
  -- Chamadas com transcrição longa (indicativo de chamada longa)
  transcription IS NOT NULL 
  AND LENGTH(transcription) > 1000
ORDER BY LENGTH(transcription) DESC
LIMIT 5;

-- 4. Estatísticas por formato
SELECT 'ESTATÍSTICAS POR FORMATO:' as info;
SELECT 
  'Campo duration' as campo,
  COUNT(*) as total,
  MIN(duration) as minimo,
  MAX(duration) as maximo,
  AVG(duration) as media
FROM calls
WHERE duration > 0

UNION ALL

SELECT 
  'Campo duration_formated (em segundos)' as campo,
  COUNT(*) as total,
  MIN(EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER) as minimo,
  MAX(EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER) as maximo,
  AVG(EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER) as media
FROM calls
WHERE duration_formated IS NOT NULL 
  AND duration_formated != '00:00:00';
