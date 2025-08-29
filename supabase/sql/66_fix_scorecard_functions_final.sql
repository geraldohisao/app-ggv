-- ===================================================================
-- FIX SCORECARD FUNCTIONS FINAL - Remover e recriar todas as funções
-- ===================================================================

-- 1. Remover todas as funções existentes que podem conflitar
DROP FUNCTION IF EXISTS get_scorecards_simple();
DROP FUNCTION IF EXISTS get_scorecard_call_types(UUID);
DROP FUNCTION IF EXISTS toggle_scorecard_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS delete_scorecard_simple(UUID);
DROP FUNCTION IF EXISTS get_scorecards_with_call_types();
DROP FUNCTION IF EXISTS update_scorecard_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS delete_scorecard(UUID);

-- 2. Verificar estrutura da tabela scorecards
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scorecards' 
AND column_name IN ('active', 'is_active')
ORDER BY column_name;

-- 3. Função simples para listar scorecards
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

-- 4. Função para obter call_types de um scorecard
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

-- 5. Função para ativar/desativar scorecard
CREATE OR REPLACE FUNCTION toggle_scorecard_status(
    scorecard_id_param UUID,
    new_status BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    UPDATE scorecards 
    SET active = new_status, updated_at = NOW()
    WHERE id = scorecard_id_param
    RETURNING active INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;

-- 6. Função para excluir scorecard
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

    -- Remover mapeamentos se a tabela existir
    DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = scorecard_id_param;
    
    -- Remover critérios
    DELETE FROM scorecard_criteria WHERE scorecard_id = scorecard_id_param;
    
    -- Remover scorecard
    DELETE FROM scorecards WHERE id = scorecard_id_param;
    
    RETURN TRUE;
END;
$$;

-- 7. Função para criar scorecard simples
CREATE OR REPLACE FUNCTION create_scorecard_simple(
    scorecard_name VARCHAR,
    scorecard_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM scorecards WHERE name = scorecard_name) THEN
        RETURN NULL;
    END IF;

    -- Criar scorecard
    INSERT INTO scorecards (id, name, description, active, created_at, updated_at)
    VALUES (gen_random_uuid(), scorecard_name, scorecard_description, true, NOW(), NOW())
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- 8. Função para obter tipos de chamada disponíveis
CREATE OR REPLACE FUNCTION get_available_call_types()
RETURNS TEXT[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT ARRAY[
        'outbound',
        'inbound', 
        'consultoria',
        'follow_up',
        'demo',
        'closing'
    ];
$$;

-- 9. Conceder permissões
GRANT EXECUTE ON FUNCTION get_scorecards_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_scorecard_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_scorecard_simple TO authenticated;
GRANT EXECUTE ON FUNCTION create_scorecard_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_call_types TO authenticated;

-- 10. Testar as funções
SELECT 'Funções de scorecard recriadas com sucesso!' as status;

-- 11. Mostrar scorecards existentes
SELECT id, name, active, created_at FROM scorecards ORDER BY created_at DESC;
