-- Criar funções RPC para scorecard se não existirem

-- 1. Função para buscar critérios do scorecard
CREATE OR REPLACE FUNCTION get_scorecard_criteria(scorecard_id_param UUID)
RETURNS TABLE (
  id UUID,
  scorecard_id UUID,
  name TEXT,
  description TEXT,
  weight INTEGER,
  max_score INTEGER,
  order_index INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.scorecard_id,
    sc.name,
    sc.description,
    sc.weight,
    sc.max_score,
    sc.order_index,
    sc.created_at,
    sc.updated_at
  FROM scorecard_criteria sc
  WHERE sc.scorecard_id = scorecard_id_param
  ORDER BY sc.order_index ASC;
END;
$$;

-- 2. Função para buscar scorecard ativo
CREATE OR REPLACE FUNCTION get_active_scorecard()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  conversation_type TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.conversation_type,
    s.active,
    s.created_at,
    s.updated_at
  FROM scorecards s
  WHERE s.active = true
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- 3. Função para listar todos os scorecards
CREATE OR REPLACE FUNCTION get_all_scorecards()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  conversation_type TEXT,
  active BOOLEAN,
  criteria_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.conversation_type,
    s.active,
    COUNT(sc.id) as criteria_count,
    s.created_at,
    s.updated_at
  FROM scorecards s
  LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
  GROUP BY s.id, s.name, s.description, s.conversation_type, s.active, s.created_at, s.updated_at
  ORDER BY s.active DESC, s.created_at DESC;
END;
$$;

-- 4. Testar as funções criadas
SELECT 'Testando função get_active_scorecard...' as status;
SELECT * FROM get_active_scorecard();

SELECT 'Testando função get_all_scorecards...' as status;
SELECT * FROM get_all_scorecards();

-- Testar get_scorecard_criteria se houver scorecard ativo
DO $$
DECLARE
    active_scorecard_id UUID;
BEGIN
    SELECT id INTO active_scorecard_id 
    FROM get_active_scorecard() 
    LIMIT 1;
    
    IF active_scorecard_id IS NOT NULL THEN
        RAISE NOTICE 'Testando critérios do scorecard: %', active_scorecard_id;
        PERFORM * FROM get_scorecard_criteria(active_scorecard_id);
    ELSE
        RAISE NOTICE 'Nenhum scorecard ativo para testar critérios';
    END IF;
END $$;
