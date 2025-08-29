-- ===================================================================
-- ADD SCORECARD EDIT FUNCTIONS - Funções para editar e vincular call_types
-- ===================================================================

-- 1. Criar tabela de mapeamento call_type se não existir
CREATE TABLE IF NOT EXISTS scorecard_call_type_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    call_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scorecard_id, call_type)
);

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

-- 3. Função para editar scorecard com call_types
CREATE OR REPLACE FUNCTION edit_scorecard_with_call_types(
    scorecard_id_param UUID,
    scorecard_name VARCHAR,
    scorecard_description TEXT,
    call_types_array TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    call_type_item TEXT;
BEGIN
    -- Verificar se scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Atualizar scorecard
    UPDATE scorecards 
    SET 
        name = scorecard_name,
        description = scorecard_description,
        updated_at = NOW()
    WHERE id = scorecard_id_param;

    -- Limpar mapeamentos existentes
    DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = scorecard_id_param;
    
    -- Adicionar novos mapeamentos
    IF call_types_array IS NOT NULL AND array_length(call_types_array, 1) > 0 THEN
        FOREACH call_type_item IN ARRAY call_types_array
        LOOP
            INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
            VALUES (scorecard_id_param, call_type_item)
            ON CONFLICT (scorecard_id, call_type) DO NOTHING;
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$;

-- 4. Função para criar scorecard com call_types
CREATE OR REPLACE FUNCTION create_scorecard_with_call_types(
    scorecard_name VARCHAR,
    scorecard_description TEXT,
    call_types_array TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
    call_type_item TEXT;
BEGIN
    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM scorecards WHERE name = scorecard_name) THEN
        RETURN NULL;
    END IF;

    -- Criar scorecard
    INSERT INTO scorecards (id, name, description, active, created_at, updated_at)
    VALUES (gen_random_uuid(), scorecard_name, scorecard_description, true, NOW(), NOW())
    RETURNING id INTO new_id;
    
    -- Adicionar mapeamentos de call_type
    IF call_types_array IS NOT NULL AND array_length(call_types_array, 1) > 0 THEN
        FOREACH call_type_item IN ARRAY call_types_array
        LOOP
            INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
            VALUES (new_id, call_type_item);
        END LOOP;
    END IF;
    
    RETURN new_id;
END;
$$;

-- 5. Função para obter scorecard completo com call_types
CREATE OR REPLACE FUNCTION get_scorecard_complete(scorecard_id_param UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    call_types TEXT[],
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
        COALESCE(
            (SELECT array_agg(sctm.call_type) 
             FROM scorecard_call_type_mapping sctm 
             WHERE sctm.scorecard_id = s.id),
            ARRAY[]::TEXT[]
        ) as call_types,
        COALESCE((SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as criteria_count,
        COALESCE((SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as total_weight
    FROM scorecards s
    WHERE s.id = scorecard_id_param;
$$;

-- 6. Função melhorada para listar scorecards com call_types
CREATE OR REPLACE FUNCTION get_scorecards_with_call_types()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    call_types TEXT[],
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
        COALESCE(
            (SELECT array_agg(sctm.call_type) 
             FROM scorecard_call_type_mapping sctm 
             WHERE sctm.scorecard_id = s.id),
            ARRAY[]::TEXT[]
        ) as call_types,
        COALESCE((SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as criteria_count,
        COALESCE((SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as total_weight
    FROM scorecards s
    ORDER BY s.created_at DESC;
$$;

-- 7. Função para obter scorecard por call_type (para IA)
CREATE OR REPLACE FUNCTION get_scorecard_by_call_type(call_type_param TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.name,
        s.description,
        s.active as is_active
    FROM scorecards s
    JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
    WHERE sctm.call_type = call_type_param 
    AND s.active = true
    ORDER BY s.created_at DESC
    LIMIT 1;
$$;

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION get_scorecard_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION edit_scorecard_with_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION create_scorecard_with_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecards_with_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_by_call_type TO authenticated;

-- 9. RLS para tabela de mapeamento
ALTER TABLE scorecard_call_type_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scorecard_call_type_mapping_select" ON scorecard_call_type_mapping;
DROP POLICY IF EXISTS "scorecard_call_type_mapping_insert" ON scorecard_call_type_mapping;
DROP POLICY IF EXISTS "scorecard_call_type_mapping_update" ON scorecard_call_type_mapping;
DROP POLICY IF EXISTS "scorecard_call_type_mapping_delete" ON scorecard_call_type_mapping;

CREATE POLICY "scorecard_call_type_mapping_select" ON scorecard_call_type_mapping
    FOR SELECT USING (true);

CREATE POLICY "scorecard_call_type_mapping_insert" ON scorecard_call_type_mapping
    FOR INSERT WITH CHECK (true);

CREATE POLICY "scorecard_call_type_mapping_update" ON scorecard_call_type_mapping
    FOR UPDATE USING (true);

CREATE POLICY "scorecard_call_type_mapping_delete" ON scorecard_call_type_mapping
    FOR DELETE USING (true);

-- 10. Inserir mapeamento para scorecard existente se houver
INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
SELECT s.id, 'consultoria'
FROM scorecards s
WHERE s.name = 'Ligação - Consultoria'
AND NOT EXISTS (
    SELECT 1 FROM scorecard_call_type_mapping 
    WHERE scorecard_id = s.id AND call_type = 'consultoria'
);

-- 11. Testar as funções
SELECT 'Testando get_scorecards_with_call_types...' as status;
SELECT COUNT(*) as scorecard_count FROM get_scorecards_with_call_types();

SELECT 'Funções de edição e call_types criadas com sucesso!' as final_status;
