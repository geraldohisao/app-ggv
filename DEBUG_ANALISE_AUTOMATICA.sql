-- 🔍 DEBUG: Por que análise automática não está funcionando?
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR SE TABELA ANALYSIS_QUEUE EXISTE
-- ===============================================================

SELECT 
  'TABELA ANALYSIS_QUEUE' as info,
  COUNT(*) as total_items,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as falhadas,
  MIN(created_at) as primeira_fila,
  MAX(created_at) as ultima_fila
FROM analysis_queue;

-- ===============================================================
-- 2. VERIFICAR SE TRIGGER AUTOMÁTICO EXISTE
-- ===============================================================

SELECT 
  'TRIGGERS AUTOMÁTICOS' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name ILIKE '%analysis%' 
   OR action_statement ILIKE '%analysis_queue%'
ORDER BY trigger_name;

-- ===============================================================
-- 3. VERIFICAR FUNÇÃO trigger_auto_analysis
-- ===============================================================

SELECT 
  'FUNÇÃO trigger_auto_analysis' as info,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_definition ILIKE '%INSERT INTO analysis_queue%' THEN 'ADICIONA À FILA'
    WHEN routine_definition ILIKE '%duration%' THEN 'VERIFICA DURAÇÃO'
    ELSE 'OUTROS'
  END as funcionalidade
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name ILIKE '%trigger_auto_analysis%';

-- ===============================================================
-- 4. TESTAR CRITÉRIOS DE ELEGIBILIDADE
-- ===============================================================

SELECT 
  'CHAMADAS ELEGÍVEIS PARA ANÁLISE' as info,
  COUNT(*) as total_elegives,
  COUNT(CASE WHEN duration >= 30 THEN 1 END) as com_duracao_minima,
  COUNT(CASE WHEN transcription IS NOT NULL AND LENGTH(transcription) > 100 THEN 1 END) as com_transcricao_valida,
  COUNT(CASE WHEN duration >= 30 AND transcription IS NOT NULL AND LENGTH(transcription) > 100 THEN 1 END) as elegives_completas,
  COUNT(CASE WHEN EXISTS(SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id) THEN 1 END) as ja_analisadas
FROM calls c
WHERE created_at >= NOW() - INTERVAL '7 days'; -- Últimos 7 dias

-- ===============================================================
-- 5. VERIFICAR CHAMADAS RECENTES NÃO ANALISADAS
-- ===============================================================

SELECT 
  'SAMPLE CHAMADAS NÃO ANALISADAS' as info,
  c.id,
  c.created_at,
  c.duration,
  LENGTH(c.transcription) as tamanho_transcricao,
  c.agent_id,
  CASE 
    WHEN c.duration < 30 THEN 'DURAÇÃO INSUFICIENTE'
    WHEN c.transcription IS NULL THEN 'SEM TRANSCRIÇÃO'
    WHEN LENGTH(c.transcription) <= 100 THEN 'TRANSCRIÇÃO MUITO CURTA'
    ELSE 'ELEGÍVEL PARA ANÁLISE'
  END as status_elegibilidade,
  EXISTS(SELECT 1 FROM analysis_queue aq WHERE aq.call_id = c.id) as na_fila,
  EXISTS(SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id) as ja_analisada
FROM calls c
WHERE c.created_at >= NOW() - INTERVAL '3 days' -- Últimas 3 dias
  AND NOT EXISTS(SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id) -- Não analisadas
ORDER BY c.created_at DESC
LIMIT 20;

-- ===============================================================
-- 6. VERIFICAR WORKER/PROCESSAMENTO AUTOMÁTICO
-- ===============================================================

SELECT 
  'STATUS FILA vs ANÁLISES' as info,
  (SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending') as fila_pendente,
  (SELECT COUNT(*) FROM analysis_queue WHERE status = 'completed') as fila_concluida,
  (SELECT COUNT(*) FROM call_analysis WHERE created_at >= NOW() - INTERVAL '24 hours') as analises_ultimas_24h,
  (SELECT COUNT(*) FROM calls WHERE created_at >= NOW() - INTERVAL '24 hours' AND duration >= 30) as elegives_ultimas_24h;

-- ===============================================================
-- 7. VERIFICAR SE HÁ JOBS TRAVADOS
-- ===============================================================

SELECT 
  'JOBS POTENCIALMENTE TRAVADOS' as info,
  call_id,
  status,
  priority,
  created_at,
  -- Tempo desde criação
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as horas_na_fila
FROM analysis_queue
WHERE status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '1 hour' -- Na fila há mais de 1 hora
ORDER BY created_at
LIMIT 10;
