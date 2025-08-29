-- ===================================================================
-- FORCE DROP ALL SCORECARD FUNCTIONS - Remover TUDO relacionado a scorecards
-- ===================================================================

-- 1. Forçar remoção de TODAS as funções relacionadas a scorecards (todas as variações possíveis)
DROP FUNCTION IF EXISTS get_scorecards_simple() CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_call_types(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_scorecard_status(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS delete_scorecard_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_scorecard_simple(VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_available_call_types() CASCADE;

-- Funções que podem existir com nomes diferentes
DROP FUNCTION IF EXISTS get_scorecards_with_call_types() CASCADE;
DROP FUNCTION IF EXISTS update_scorecard_status(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS delete_scorecard(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_scorecard(VARCHAR, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS edit_scorecard(UUID, VARCHAR, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS add_scorecard_criterion(UUID, VARCHAR, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS remove_scorecard_criterion(UUID) CASCADE;

-- Funções que podem ter parâmetros diferentes
DROP FUNCTION IF EXISTS get_scorecard_by_call_type(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_criteria(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_scorecards() CASCADE;

-- 2. Verificar se ainda existem funções relacionadas
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE '%scorecard%'
ORDER BY routine_name;

-- 3. Agora recriar as funções básicas
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

-- 4. Função para ativar/desativar scorecard
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

-- 5. Função para excluir scorecard
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
    BEGIN
        DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = scorecard_id_param;
    EXCEPTION
        WHEN undefined_table THEN
            -- Tabela não existe, continuar
            NULL;
    END;
    
    -- Remover critérios
    DELETE FROM scorecard_criteria WHERE scorecard_id = scorecard_id_param;
    
    -- Remover scorecard
    DELETE FROM scorecards WHERE id = scorecard_id_param;
    
    RETURN TRUE;
END;
$$;

-- 6. Função para criar scorecard simples
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

-- 7. Função para obter tipos de chamada disponíveis (simples)
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

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION get_scorecards_simple TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_scorecard_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_scorecard_simple TO authenticated;
GRANT EXECUTE ON FUNCTION create_scorecard_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_call_types TO authenticated;

-- 9. Verificar se as funções foram criadas
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_scorecards_simple',
    'toggle_scorecard_status', 
    'delete_scorecard_simple',
    'create_scorecard_simple',
    'get_available_call_types'
)
ORDER BY routine_name;

-- 10. Testar uma função
SELECT 'Testando get_scorecards_simple...' as status;
SELECT COUNT(*) as scorecard_count FROM get_scorecards_simple();

SELECT 'Funções de scorecard recriadas com sucesso!' as final_status;
