-- =====================================================
-- SCRIPT: Verificar estrutura das tabelas de scorecard
-- OBJETIVO: Entender a estrutura atual antes de corrigir
-- =====================================================

-- Verificar se as tabelas existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scorecards', 'scorecard_criteria');

-- Verificar estrutura da tabela scorecards (se existir)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela scorecard_criteria (se existir)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecard_criteria'
ORDER BY ordinal_position;

-- Verificar dados existentes em scorecards (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecards') THEN
    RAISE NOTICE 'Dados em scorecards:';
    PERFORM * FROM scorecards LIMIT 5;
  END IF;
END $$;

-- Verificar dados existentes em scorecard_criteria (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecard_criteria') THEN
    RAISE NOTICE 'Dados em scorecard_criteria:';
    PERFORM * FROM scorecard_criteria LIMIT 5;
  END IF;
END $$;
