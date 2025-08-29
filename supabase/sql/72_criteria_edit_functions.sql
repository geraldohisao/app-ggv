-- ===================================================================
-- CRITERIA EDIT FUNCTIONS - Funções para editar e excluir critérios
-- ===================================================================

-- 1. Função para editar um critério específico
CREATE OR REPLACE FUNCTION edit_scorecard_criterion(
    criterion_id_param UUID,
    criterion_name TEXT,
    criterion_description TEXT DEFAULT NULL,
    criterion_weight INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validações
    IF criterion_name IS NULL OR trim(criterion_name) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nome do critério é obrigatório'
        );
    END IF;

    IF criterion_weight IS NULL OR criterion_weight < 1 OR criterion_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Peso deve estar entre 1 e 100'
        );
    END IF;

    -- Verificar se o critério existe
    IF NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE id = criterion_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Critério não encontrado'
        );
    END IF;

    -- Atualizar o critério
    UPDATE scorecard_criteria 
    SET 
        name = trim(criterion_name),
        description = COALESCE(trim(criterion_description), description),
        weight = criterion_weight,
        updated_at = NOW()
    WHERE id = criterion_id_param;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Critério atualizado com sucesso',
        'criterion_id', criterion_id_param
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao atualizar critério: ' || SQLERRM
        );
END;
$$;

-- 2. Função para excluir um critério específico
CREATE OR REPLACE FUNCTION delete_scorecard_criterion(
    criterion_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    scorecard_id_var UUID;
    criterion_name_var TEXT;
BEGIN
    -- Buscar informações do critério antes de excluir
    SELECT scorecard_id, name 
    INTO scorecard_id_var, criterion_name_var
    FROM scorecard_criteria 
    WHERE id = criterion_id_param;

    -- Verificar se o critério existe
    IF scorecard_id_var IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Critério não encontrado'
        );
    END IF;

    -- Verificar se não é o último critério do scorecard
    IF (SELECT COUNT(*) FROM scorecard_criteria WHERE scorecard_id = scorecard_id_var) <= 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Não é possível excluir o último critério do scorecard'
        );
    END IF;

    -- Excluir o critério
    DELETE FROM scorecard_criteria WHERE id = criterion_id_param;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Critério "' || criterion_name_var || '" excluído com sucesso',
        'scorecard_id', scorecard_id_var
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao excluir critério: ' || SQLERRM
        );
END;
$$;

-- 3. Função para obter detalhes de um critério específico
CREATE OR REPLACE FUNCTION get_criterion_details(
    criterion_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'scorecard_id', scorecard_id,
        'name', name,
        'description', description,
        'weight', weight,
        'order_index', order_index,
        'created_at', created_at,
        'updated_at', updated_at
    )
    INTO result
    FROM scorecard_criteria
    WHERE id = criterion_id_param;

    IF result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Critério não encontrado'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'criterion', result
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao buscar critério: ' || SQLERRM
        );
END;
$$;

-- 4. Atualizar função de adicionar critério para não usar max_score
CREATE OR REPLACE FUNCTION add_scorecard_criterion(
    scorecard_id_param UUID,
    criterion_name TEXT,
    criterion_description TEXT DEFAULT NULL,
    criterion_weight INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_criterion_id UUID;
    next_order_index INTEGER;
BEGIN
    -- Validações
    IF criterion_name IS NULL OR trim(criterion_name) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nome do critério é obrigatório'
        );
    END IF;

    IF criterion_weight IS NULL OR criterion_weight < 1 OR criterion_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Peso deve estar entre 1 e 100'
        );
    END IF;

    -- Verificar se o scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Scorecard não encontrado'
        );
    END IF;

    -- Obter próximo order_index
    SELECT COALESCE(MAX(order_index), 0) + 1
    INTO next_order_index
    FROM scorecard_criteria
    WHERE scorecard_id = scorecard_id_param;

    -- Inserir novo critério (sem max_score)
    INSERT INTO scorecard_criteria (
        scorecard_id,
        name,
        description,
        weight,
        order_index
    ) VALUES (
        scorecard_id_param,
        trim(criterion_name),
        NULLIF(trim(criterion_description), ''),
        criterion_weight,
        next_order_index
    ) RETURNING id INTO new_criterion_id;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Critério adicionado com sucesso',
        'criterion_id', new_criterion_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao adicionar critério: ' || SQLERRM
        );
END;
$$;

-- 5. Função para reordenar critérios
CREATE OR REPLACE FUNCTION reorder_scorecard_criteria(
    scorecard_id_param UUID,
    criteria_order UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    criterion_id UUID;
    new_order INTEGER := 1;
BEGIN
    -- Verificar se o scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Scorecard não encontrado'
        );
    END IF;

    -- Atualizar ordem dos critérios
    FOREACH criterion_id IN ARRAY criteria_order
    LOOP
        UPDATE scorecard_criteria 
        SET order_index = new_order
        WHERE id = criterion_id AND scorecard_id = scorecard_id_param;
        
        new_order := new_order + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Ordem dos critérios atualizada com sucesso'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao reordenar critérios: ' || SQLERRM
        );
END;
$$;

-- 6. Conceder permissões
GRANT EXECUTE ON FUNCTION edit_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION delete_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION get_criterion_details TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_scorecard_criteria TO authenticated;

-- 7. Atualizar comentários
COMMENT ON FUNCTION edit_scorecard_criterion IS 'Edita um critério específico do scorecard (apenas peso, sem max_score)';
COMMENT ON FUNCTION delete_scorecard_criterion IS 'Exclui um critério específico do scorecard (com validação)';
COMMENT ON FUNCTION get_criterion_details IS 'Obtém detalhes de um critério específico';
COMMENT ON FUNCTION reorder_scorecard_criteria IS 'Reordena critérios de um scorecard';

SELECT 'Funções de edição de critérios criadas com sucesso!' as status;
