-- Verificar estrutura das tabelas de scorecard
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('scorecards', 'scorecard_criteria')
ORDER BY table_name, ordinal_position;
