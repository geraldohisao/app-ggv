-- ===================================================================
-- ENHANCED SCORECARD MANAGEMENT SYSTEM
-- ===================================================================

-- 1. Função para editar scorecard
CREATE OR REPLACE FUNCTION edit_scorecard(
    p_scorecard_id UUID,
    p_name VARCHAR(255),
    p_description TEXT,
    p_call_types TEXT[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_call_type TEXT;
BEGIN
    -- Verificar se o scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = p_scorecard_id) THEN
        RETURN json_build_object('success', false, 'error', 'Scorecard não encontrado');
    END IF;

    -- Atualizar scorecard
    UPDATE scorecards 
    SET 
        name = p_name,
        description = p_description,
        updated_at = NOW()
    WHERE id = p_scorecard_id;

    -- Limpar mapeamentos existentes se novos call_types foram fornecidos
    IF p_call_types IS NOT NULL THEN
        DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = p_scorecard_id;
        
        -- Adicionar novos mapeamentos
        FOREACH v_call_type IN ARRAY p_call_types
        LOOP
            INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
            VALUES (p_scorecard_id, v_call_type)
            ON CONFLICT (scorecard_id, call_type) DO NOTHING;
        END LOOP;
    END IF;

    -- Retornar sucesso
    SELECT json_build_object(
        'success', true,
        'scorecard', json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'is_active', s.is_active,
            'call_types', COALESCE(
                (SELECT array_agg(call_type) FROM scorecard_call_type_mapping WHERE scorecard_id = s.id),
                ARRAY[]::TEXT[]
            )
        )
    ) INTO v_result
    FROM scorecards s
    WHERE s.id = p_scorecard_id;

    RETURN v_result;
END;
$$;

-- 2. Função para criar novo scorecard
CREATE OR REPLACE FUNCTION create_scorecard(
    p_name VARCHAR(255),
    p_description TEXT,
    p_call_types TEXT[] DEFAULT ARRAY['outbound']
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scorecard_id UUID;
    v_result JSON;
    v_call_type TEXT;
BEGIN
    -- Verificar se já existe scorecard com esse nome
    IF EXISTS (SELECT 1 FROM scorecards WHERE name = p_name) THEN
        RETURN json_build_object('success', false, 'error', 'Já existe um scorecard com esse nome');
    END IF;

    -- Criar novo scorecard
    INSERT INTO scorecards (id, name, description, is_active)
    VALUES (gen_random_uuid(), p_name, p_description, true)
    RETURNING id INTO v_scorecard_id;

    -- Adicionar mapeamentos de call_type
    FOREACH v_call_type IN ARRAY p_call_types
    LOOP
        INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
        VALUES (v_scorecard_id, v_call_type);
    END LOOP;

    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'scorecard', json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'is_active', s.is_active,
            'call_types', COALESCE(
                (SELECT array_agg(call_type) FROM scorecard_call_type_mapping WHERE scorecard_id = s.id),
                ARRAY[]::TEXT[]
            )
        )
    ) INTO v_result
    FROM scorecards s
    WHERE s.id = v_scorecard_id;

    RETURN v_result;
END;
$$;

-- 3. Função para listar scorecards com call_types
CREATE OR REPLACE FUNCTION get_scorecards_with_call_types()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'is_active', s.is_active,
            'created_at', s.created_at,
            'updated_at', s.updated_at,
            'call_types', COALESCE(
                (SELECT array_agg(sctm.call_type) 
                 FROM scorecard_call_type_mapping sctm 
                 WHERE sctm.scorecard_id = s.id),
                ARRAY[]::TEXT[]
            ),
            'criteria_count', COALESCE(
                (SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id),
                0
            ),
            'total_weight', COALESCE(
                (SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id),
                0
            )
        )
    ) INTO v_result
    FROM scorecards s
    ORDER BY s.created_at DESC;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 4. Função para adicionar critério a scorecard
CREATE OR REPLACE FUNCTION add_scorecard_criterion(
    p_scorecard_id UUID,
    p_name VARCHAR(255),
    p_description TEXT,
    p_weight INTEGER,
    p_max_score INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_criterion_id UUID;
    v_order_index INTEGER;
BEGIN
    -- Verificar se scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = p_scorecard_id) THEN
        RETURN json_build_object('success', false, 'error', 'Scorecard não encontrado');
    END IF;

    -- Obter próximo order_index
    SELECT COALESCE(MAX(order_index), 0) + 1 
    INTO v_order_index
    FROM scorecard_criteria 
    WHERE scorecard_id = p_scorecard_id;

    -- Inserir critério
    INSERT INTO scorecard_criteria (
        id, scorecard_id, name, description, weight, max_score, order_index
    )
    VALUES (
        gen_random_uuid(), p_scorecard_id, p_name, p_description, p_weight, p_max_score, v_order_index
    )
    RETURNING id INTO v_criterion_id;

    RETURN json_build_object(
        'success', true,
        'criterion_id', v_criterion_id,
        'order_index', v_order_index
    );
END;
$$;

-- 5. Função para remover critério
CREATE OR REPLACE FUNCTION remove_scorecard_criterion(
    p_criterion_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se critério existe
    IF NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE id = p_criterion_id) THEN
        RETURN json_build_object('success', false, 'error', 'Critério não encontrado');
    END IF;

    -- Remover critério
    DELETE FROM scorecard_criteria WHERE id = p_criterion_id;

    RETURN json_build_object('success', true);
END;
$$;

-- 6. Função para obter call_types disponíveis
CREATE OR REPLACE FUNCTION get_available_call_types()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN json_build_array(
        'outbound',
        'inbound', 
        'consultoria',
        'follow_up',
        'demo',
        'closing'
    );
END;
$$;

-- 7. Atualizar função delete_scorecard para ser mais robusta
CREATE OR REPLACE FUNCTION delete_scorecard(scorecard_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scorecard_name VARCHAR(255);
BEGIN
    -- Verificar se scorecard existe
    SELECT name INTO v_scorecard_name 
    FROM scorecards 
    WHERE id = scorecard_id_param;

    IF v_scorecard_name IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Scorecard não encontrado');
    END IF;

    -- Remover mapeamentos de call_type
    DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = scorecard_id_param;

    -- Remover critérios
    DELETE FROM scorecard_criteria WHERE scorecard_id = scorecard_id_param;

    -- Remover scorecard
    DELETE FROM scorecards WHERE id = scorecard_id_param;

    RETURN json_build_object(
        'success', true, 
        'message', 'Scorecard "' || v_scorecard_name || '" removido com sucesso'
    );
END;
$$;

-- 8. Criar tabela de mapeamento call_type se não existir
CREATE TABLE IF NOT EXISTS scorecard_call_type_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    call_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scorecard_id, call_type)
);

-- 9. Inserir mapeamentos para scorecard existente
INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
SELECT s.id, 'consultoria'
FROM scorecards s
WHERE s.name = 'Ligação - Consultoria'
AND NOT EXISTS (
    SELECT 1 FROM scorecard_call_type_mapping 
    WHERE scorecard_id = s.id AND call_type = 'consultoria'
);

-- 10. Conceder permissões
GRANT EXECUTE ON FUNCTION edit_scorecard TO authenticated;
GRANT EXECUTE ON FUNCTION create_scorecard TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecards_with_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION add_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION remove_scorecard_criterion TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_call_types TO authenticated;

-- 11. RLS para nova tabela
ALTER TABLE scorecard_call_type_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_call_type_mapping_select" ON scorecard_call_type_mapping
    FOR SELECT USING (true);

CREATE POLICY "scorecard_call_type_mapping_insert" ON scorecard_call_type_mapping
    FOR INSERT WITH CHECK (true);

CREATE POLICY "scorecard_call_type_mapping_update" ON scorecard_call_type_mapping
    FOR UPDATE USING (true);

CREATE POLICY "scorecard_call_type_mapping_delete" ON scorecard_call_type_mapping
    FOR DELETE USING (true);
