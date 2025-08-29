-- ===================================================================
-- FIX CALL TYPES AND CRITERIA - Puxar call_types reais e permitir editar critérios
-- ===================================================================

-- 1. Função para obter call_types únicos da tabela calls (dados reais)
CREATE OR REPLACE FUNCTION get_real_call_types()
RETURNS TEXT[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        array_agg(DISTINCT call_type ORDER BY call_type), 
        ARRAY[]::TEXT[]
    )
    FROM calls 
    WHERE call_type IS NOT NULL 
    AND call_type != '';
$$;

-- 2. Função para obter critérios de um scorecard
CREATE OR REPLACE FUNCTION get_scorecard_criteria(scorecard_id_param UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    weight INTEGER,
    max_score INTEGER,
    order_index INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        sc.id,
        sc.name,
        sc.description,
        sc.weight,
        sc.max_score,
        sc.order_index
    FROM scorecard_criteria sc
    WHERE sc.scorecard_id = scorecard_id_param
    ORDER BY sc.order_index ASC, sc.created_at ASC;
$$;

-- 3. Função para adicionar critério a um scorecard
CREATE OR REPLACE FUNCTION add_scorecard_criterion(
    scorecard_id_param UUID,
    criterion_name VARCHAR,
    criterion_description TEXT,
    criterion_weight INTEGER,
    criterion_max_score INTEGER DEFAULT 10
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_criterion_id UUID;
    next_order INTEGER;
BEGIN
    -- Verificar se scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN NULL;
    END IF;

    -- Obter próximo order_index
    SELECT COALESCE(MAX(order_index), 0) + 1 
    INTO next_order
    FROM scorecard_criteria 
    WHERE scorecard_id = scorecard_id_param;

    -- Inserir critério
    INSERT INTO scorecard_criteria (
        id, scorecard_id, name, description, weight, max_score, order_index, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), scorecard_id_param, criterion_name, criterion_description, 
        criterion_weight, criterion_max_score, next_order, NOW(), NOW()
    )
    RETURNING id INTO new_criterion_id;

    RETURN new_criterion_id;
END;
$$;

-- 4. Função para atualizar critério
CREATE OR REPLACE FUNCTION update_scorecard_criterion(
    criterion_id_param UUID,
    criterion_name VARCHAR,
    criterion_description TEXT,
    criterion_weight INTEGER,
    criterion_max_score INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se critério existe
    IF NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE id = criterion_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Atualizar critério
    UPDATE scorecard_criteria 
    SET 
        name = criterion_name,
        description = criterion_description,
        weight = criterion_weight,
        max_score = criterion_max_score,
        updated_at = NOW()
    WHERE id = criterion_id_param;

    RETURN TRUE;
END;
$$;

-- 5. Função para remover critério
CREATE OR REPLACE FUNCTION remove_scorecard_criterion(criterion_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se critério existe
    IF NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE id = criterion_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Remover critério
    DELETE FROM scorecard_criteria WHERE id = criterion_id_param;

    RETURN TRUE;
END;
$$;

-- 6. Função para reordenar critérios
CREATE OR REPLACE FUNCTION reorder_scorecard_criteria(
    scorecard_id_param UUID,
    criteria_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    criterion_id UUID;
    new_order INTEGER := 1;
BEGIN
    -- Verificar se scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Atualizar ordem dos critérios
    FOREACH criterion_id IN ARRAY criteria_ids
    LOOP
        UPDATE scorecard_criteria 
        SET order_index = new_order, updated_at = NOW()
        WHERE id = criterion_id AND scorecard_id = scorecard_id_param;
        
        new_order := new_order + 1;
    END LOOP;

    RETURN TRUE;
END;
$$;

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION get_real_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_criteria TO authenticated;
GRANT EXECUTE ON FUNCTION add_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION update_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION remove_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_scorecard_criteria TO authenticated;

-- 8. Testar as funções
SELECT 'Testando get_real_call_types...' as status;
SELECT get_real_call_types() as real_call_types;

SELECT 'Testando get_scorecard_criteria...' as status;
SELECT COUNT(*) as criteria_count 
FROM get_scorecard_criteria((SELECT id FROM scorecards LIMIT 1));

SELECT 'Funções de call_types e critérios criadas com sucesso!' as final_status;
