-- Debug da inconsistência de duração da chamada
-- Verificar dados específicos da chamada 5091c852-7fce-4cbd-ac11-790da156a214

-- 1. Dados básicos da chamada
SELECT 
  id,
  duration,
  created_at,
  status,
  status_voip,
  recording_url,
  LENGTH(transcription) as transcription_length,
  SUBSTRING(transcription, 1, 200) as transcription_preview
FROM calls 
WHERE id = '5091c852-7fce-4cbd-ac11-790da156a214';

-- 2. Verificar se há múltiplas entradas
SELECT COUNT(*) as total_entries
FROM calls 
WHERE id = '5091c852-7fce-4cbd-ac11-790da156a214';

-- 3. Verificar dados do áudio/recording
SELECT 
  id,
  recording_url,
  audio_url,
  duration,
  -- Extrair informações do URL se houver padrões
  CASE 
    WHEN recording_url LIKE '%duration%' THEN 'URL contains duration info'
    ELSE 'No duration in URL'
  END as url_analysis
FROM calls 
WHERE id = '5091c852-7fce-4cbd-ac11-790da156a214';

-- 4. Verificar se há dados em outras tabelas relacionadas
SELECT 
  'calls' as table_name,
  COUNT(*) as count
FROM calls 
WHERE id = '5091c852-7fce-4cbd-ac11-790da156a214'

UNION ALL

SELECT 
  'call_analysis' as table_name,
  COUNT(*) as count
FROM call_analysis 
WHERE call_id = '5091c852-7fce-4cbd-ac11-790da156a214';

-- 5. Verificar transcrição completa
SELECT 
  id,
  LENGTH(transcription) as transcription_length,
  transcription
FROM calls 
WHERE id = '5091c852-7fce-4cbd-ac11-790da156a214';
