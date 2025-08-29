-- =====================================================
-- SCRIPT: Funções de Gerenciamento de Scorecards
-- OBJETIVO: Implementar exclusão e ativação de scorecards
-- =====================================================

-- Função para excluir scorecard
CREATE OR REPLACE FUNCTION delete_scorecard(p_scorecard_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o scorecard existe
  IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = p_scorecard_id) THEN
    RAISE EXCEPTION 'Scorecard não encontrado';
  END IF;
  
  -- Excluir scorecard (critérios são excluídos automaticamente por CASCADE)
  DELETE FROM scorecards WHERE id = p_scorecard_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao excluir scorecard: %', SQLERRM;
END;
$$;

-- Função para ativar/desativar scorecard
CREATE OR REPLACE FUNCTION toggle_scorecard_status(p_scorecard_id UUID, p_active BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o scorecard existe
  IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = p_scorecard_id) THEN
    RAISE EXCEPTION 'Scorecard não encontrado';
  END IF;
  
  -- Atualizar status
  UPDATE scorecards 
  SET active = p_active, updated_at = NOW()
  WHERE id = p_scorecard_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar status do scorecard: %', SQLERRM;
END;
$$;

-- Função para obter todos os scorecards (incluindo inativos)
CREATE OR REPLACE FUNCTION get_all_scorecards()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  conversation_type VARCHAR(50),
  call_type_mapping TEXT[],
  active BOOLEAN,
  criteria_count BIGINT,
  total_weight INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
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
    s.call_type_mapping,
    s.active,
    COUNT(sc.id) as criteria_count,
    COALESCE(SUM(sc.weight), 0)::INTEGER as total_weight,
    s.created_at
  FROM scorecards s
  LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
  GROUP BY s.id, s.name, s.description, s.conversation_type, s.call_type_mapping, s.active, s.created_at
  ORDER BY s.created_at DESC;
END;
$$;

-- Grants para as novas funções
GRANT EXECUTE ON FUNCTION delete_scorecard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_scorecard_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_scorecards() TO authenticated;

-- Políticas RLS para permitir UPDATE e DELETE
DROP POLICY IF EXISTS "Allow update scorecards" ON scorecards;
CREATE POLICY "Allow update scorecards" ON scorecards FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete scorecards" ON scorecards;
CREATE POLICY "Allow delete scorecards" ON scorecards FOR DELETE TO authenticated USING (true);

COMMIT;
