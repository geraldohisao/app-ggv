-- 🕵️ INVESTIGAÇÃO DE TRIGGERS E PROCESSED_AT
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR TODOS OS TRIGGERS NA TABELA CALLS
-- ===============================================================

SELECT 
  'TRIGGERS NA TABELA CALLS' as info,
  trigger_name,
  event_manipulation as evento,
  action_timing as timing,
  action_statement as codigo_trigger,
  action_orientation as orientacao
FROM information_schema.triggers 
WHERE event_object_table = 'calls'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- ===============================================================
-- 2. VERIFICAR FUNÇÕES QUE PODEM TOCAR EM CALLS
-- ===============================================================

SELECT 
  'FUNÇÕES QUE PODEM ALTERAR CALLS' as info,
  routine_name as nome_funcao,
  routine_type as tipo,
  routine_definition as definicao
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%UPDATE calls%' OR 
    routine_definition ILIKE '%INSERT INTO calls%' OR
    routine_definition ILIKE '%processed_at%' OR
    routine_definition ILIKE '%updated_at%'
  )
ORDER BY routine_name;

-- ===============================================================
-- 3. ANÁLISE DETALHADA DO CAMPO PROCESSED_AT
-- ===============================================================

SELECT 
  'ANÁLISE PROCESSED_AT' as info,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as com_processed_at,
  COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as sem_processed_at,
  ROUND(COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_processadas,
  MIN(processed_at) as primeiro_processed,
  MAX(processed_at) as ultimo_processed
FROM calls;

-- ===============================================================
-- 4. CORRELAÇÃO ENTRE PROCESSED_AT E UPDATED_AT
-- ===============================================================

SELECT 
  'CORRELAÇÃO PROCESSED_AT vs UPDATED_AT' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN processed_at = updated_at THEN 1 END) as processed_igual_updated,
  COUNT(CASE WHEN processed_at != updated_at THEN 1 END) as processed_diferente_updated,
  COUNT(CASE WHEN processed_at IS NULL AND updated_at IS NOT NULL THEN 1 END) as so_updated,
  COUNT(CASE WHEN processed_at IS NOT NULL AND updated_at IS NULL THEN 1 END) as so_processed,
  ROUND(COUNT(CASE WHEN processed_at = updated_at THEN 1 END) * 100.0 / COUNT(*), 1) as pct_iguais
FROM calls
WHERE processed_at IS NOT NULL OR updated_at IS NOT NULL;

-- ===============================================================
-- 5. SAMPLE DE CHAMADAS COM PROCESSED_AT x CREATED_AT x UPDATED_AT
-- ===============================================================

SELECT 
  'SAMPLE TEMPORAL COMPLETO' as info,
  id,
  created_at,
  updated_at,
  processed_at,
  -- Diferenças temporais
  updated_at - created_at as diff_updated_created,
  processed_at - created_at as diff_processed_created,
  processed_at - updated_at as diff_processed_updated,
  -- Análise das datas
  EXTRACT(YEAR FROM created_at) as ano_created,
  EXTRACT(YEAR FROM updated_at) as ano_updated,
  EXTRACT(YEAR FROM processed_at) as ano_processed,
  agent_id,
  status,
  ai_status
FROM calls
WHERE processed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- ===============================================================
-- 6. VERIFICAR PADRÃO DO AI_STATUS vs PROCESSED_AT
-- ===============================================================

SELECT 
  'AI_STATUS vs PROCESSED_AT' as info,
  ai_status,
  COUNT(*) as quantidade,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as com_processed_at,
  COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as sem_processed_at,
  ROUND(COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_processadas
FROM calls
GROUP BY ai_status
ORDER BY quantidade DESC;

-- ===============================================================
-- 7. VERIFICAR SE PROCESSED_AT TEM RELAÇÃO COM TRANSCRIPTION
-- ===============================================================

SELECT 
  'PROCESSED_AT vs TRANSCRIPTION' as info,
  CASE 
    WHEN transcription IS NULL THEN 'SEM TRANSCRIÇÃO'
    WHEN LENGTH(transcription) < 100 THEN 'TRANSCRIÇÃO CURTA'
    WHEN LENGTH(transcription) >= 100 THEN 'TRANSCRIÇÃO COMPLETA'
  END as categoria_transcricao,
  COUNT(*) as quantidade,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as com_processed_at,
  ROUND(COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_processadas,
  AVG(CASE WHEN processed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (processed_at - created_at)) END) as tempo_medio_processamento_seg
FROM calls
GROUP BY CASE 
    WHEN transcription IS NULL THEN 'SEM TRANSCRIÇÃO'
    WHEN LENGTH(transcription) < 100 THEN 'TRANSCRIÇÃO CURTA'
    WHEN LENGTH(transcription) >= 100 THEN 'TRANSCRIÇÃO COMPLETA'
  END
ORDER BY quantidade DESC;

-- ===============================================================
-- 8. INVESTIGAR CHAMADAS QUE FORAM "REPROCESSADAS"
-- ===============================================================

SELECT 
  'CHAMADAS REPROCESSADAS' as info,
  COUNT(*) as total_reprocessadas,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as dias_media_para_reprocessar,
  MIN(updated_at - created_at) as menor_tempo_reprocessamento,
  MAX(updated_at - created_at) as maior_tempo_reprocessamento,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN 1 END) as reprocessadas_de_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as reprocessadas_de_2025
FROM calls
WHERE updated_at - created_at > INTERVAL '1 day'  -- Reprocessadas após mais de 1 dia
  AND updated_at IS NOT NULL 
  AND created_at IS NOT NULL;

