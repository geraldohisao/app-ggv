-- Corrigir funções existentes que conflitam
-- Execute este script ANTES do setup_complete_scorecard_system.sql

-- 1. Remover funções existentes que podem conflitar
DROP FUNCTION IF EXISTS get_scorecard_criteria(uuid);
DROP FUNCTION IF EXISTS get_active_scorecard();
DROP FUNCTION IF EXISTS get_all_scorecards();
DROP FUNCTION IF EXISTS get_call_analysis(uuid);
DROP FUNCTION IF EXISTS save_call_analysis(uuid, uuid, integer, integer, decimal, text, text[], text[], decimal, jsonb, integer);

-- 2. Verificar se as tabelas de análise já existem
DROP TABLE IF EXISTS call_analysis_criteria CASCADE;
DROP TABLE IF EXISTS call_analyses CASCADE;

-- 3. Verificar estrutura atual das tabelas de scorecard
SELECT 'Verificando estrutura das tabelas...' as status;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('scorecards', 'scorecard_criteria')
ORDER BY table_name, ordinal_position;

-- 4. Mostrar scorecards existentes
SELECT 'Scorecards existentes:' as info;
SELECT id, name, active, created_at FROM scorecards ORDER BY created_at DESC;

-- 5. Mostrar critérios existentes
SELECT 'Critérios existentes:' as info;
SELECT 
  sc.name as criterio,
  s.name as scorecard,
  sc.weight,
  sc.max_score,
  sc.order_index
FROM scorecard_criteria sc
JOIN scorecards s ON sc.scorecard_id = s.id
ORDER BY s.name, sc.order_index;

SELECT 'Funções removidas. Agora execute o setup_complete_scorecard_system.sql' as resultado;
