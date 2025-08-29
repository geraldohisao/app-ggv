-- ===================================================================
-- SIMPLE SCORECARD FUNCTIONS - Versão simplificada que deve funcionar
-- ===================================================================

-- 1. Função simples para listar scorecards
CREATE OR REPLACE FUNCTION get_scorecards_simple()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    criteria_count BIGINT,
    total_weight BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.name,
        s.description,
        s.active as is_active,
        s.created_at,
        s.updated_at,
        COALESCE((SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as criteria_count,
        COALESCE((SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as total_weight
    FROM scorecards s
    ORDER BY s.created_at DESC;
$$;

-- 2. Função para obter call_types de um scorecard
CREATE OR REPLACE FUNCTION get_scorecard_call_types(scorecard_id_param UUID)
RETURNS TEXT[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        array_agg(call_type), 
        ARRAY[]::TEXT[]
    )
    FROM scorecard_call_type_mapping 
    WHERE scorecard_id = scorecard_id_param;
$$;

-- 3. Função para ativar/desativar scorecard (simples)
CREATE OR REPLACE FUNCTION toggle_scorecard_status(
    scorecard_id_param UUID,
    new_status BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE scorecards 
    SET active = new_status, updated_at = NOW()
    WHERE id = scorecard_id_param
    RETURNING active;
$$;

-- 4. Função para excluir scorecard (simples)
CREATE OR REPLACE FUNCTION delete_scorecard_simple(scorecard_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Remover mapeamentos
    DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = scorecard_id_param;
    
    -- Remover critérios
    DELETE FROM scorecard_criteria WHERE scorecard_id = scorecard_id_param;
    
    -- Remover scorecard
    DELETE FROM scorecards WHERE id = scorecard_id_param;
    
    RETURN TRUE;
END;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION get_scorecards_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_scorecard_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_scorecard_simple TO authenticated;

-- 6. Testar as funções
SELECT 'Funções simples de scorecard criadas!' as status;
