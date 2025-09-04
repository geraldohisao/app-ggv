-- Verificar sistema de scorecards
-- Checar se existem scorecards e critérios configurados

-- 1. Verificar tabelas de scorecard
SELECT 'scorecards' as tabela, COUNT(*) as total
FROM scorecards
UNION ALL
SELECT 'scorecard_criteria' as tabela, COUNT(*) as total  
FROM scorecard_criteria;

-- 2. Listar scorecards ativos
SELECT 
  id,
  name,
  description,
  conversation_type,
  active,
  created_at
FROM scorecards 
ORDER BY active DESC, created_at DESC;

-- 3. Verificar critérios por scorecard
SELECT 
  s.name as scorecard_name,
  sc.name as criterion_name,
  sc.description as criterion_description,
  sc.weight,
  sc.max_score,
  sc.order_index
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.active = true
ORDER BY s.name, sc.order_index;

-- 4. Testar função get_scorecard_criteria (se existir)
SELECT 'Testando função get_scorecard_criteria...' as status;

-- Buscar um scorecard ativo para testar
DO $$
DECLARE
    active_scorecard_id UUID;
BEGIN
    SELECT id INTO active_scorecard_id 
    FROM scorecards 
    WHERE active = true 
    LIMIT 1;
    
    IF active_scorecard_id IS NOT NULL THEN
        RAISE NOTICE 'Scorecard ativo encontrado: %', active_scorecard_id;
        -- Aqui poderia testar a função RPC se existir
    ELSE
        RAISE NOTICE 'Nenhum scorecard ativo encontrado';
    END IF;
END $$;
