-- fix_scorecard_persistence.sql
-- Este script corrige a lógica de salvamento e leitura dos scorecards
-- para usar as colunas de array diretamente na tabela `scorecards`.

-- Adicionamos DROP FUNCTION para cada função que terá sua assinatura ou tipo de retorno alterado.

-- 1. Corrige a função de edição para salvar os arrays na tabela principal
-- Removemos TODAS as versões conflitantes da função especificando suas assinaturas exatas.

-- Versão antiga com 4 argumentos
DROP FUNCTION IF EXISTS edit_scorecard_with_call_types(UUID, VARCHAR, TEXT, TEXT[]);

-- Versão conflitante com 6 argumentos e scorecard_name como VARCHAR
DROP FUNCTION IF EXISTS edit_scorecard_with_call_types(UUID, VARCHAR, TEXT, TEXT[], TEXT[], TEXT[]);

-- Versão conflitante com 6 argumentos e scorecard_name como TEXT
DROP FUNCTION IF EXISTS edit_scorecard_with_call_types(UUID, TEXT, TEXT, TEXT[], TEXT[], TEXT[]);


-- Agora, finalmente, criamos a função correta
CREATE OR REPLACE FUNCTION edit_scorecard_with_call_types(
    scorecard_id_param UUID,
    scorecard_name VARCHAR,
    scorecard_description TEXT,
    call_types_array TEXT[],
    pipelines_array TEXT[],
    cadences_array TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Atualizar scorecard com todos os campos, incluindo os novos arrays
    UPDATE scorecards
    SET
        name = scorecard_name,
        description = scorecard_description,
        target_call_types = call_types_array,
        target_pipelines = pipelines_array,
        target_cadences = cadences_array,
        updated_at = NOW()
    WHERE id = scorecard_id_param;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, loga e retorna false
        RAISE WARNING 'Erro ao atualizar scorecard %: %', scorecard_id_param, SQLERRM;
        RETURN FALSE;
END;
$$;


-- 2. Corrige a função que busca um scorecard completo para ler as colunas de array
-- Primeiro, removemos a função antiga para poder alterar o tipo de retorno.
DROP FUNCTION IF EXISTS get_scorecard_complete(UUID);
CREATE OR REPLACE FUNCTION get_scorecard_complete(scorecard_id_param UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    target_call_types TEXT[],
    target_pipelines TEXT[],
    target_cadences TEXT[],
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
        s.target_call_types,
        s.target_pipelines,
        s.target_cadences,
        COALESCE((SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as criteria_count,
        COALESCE((SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as total_weight
    FROM scorecards s
    WHERE s.id = scorecard_id_param;
$$;


-- 3. Corrige a função que lista todos os scorecards para ler as colunas de array
-- Primeiro, removemos a função antiga para poder alterar o tipo de retorno.
DROP FUNCTION IF EXISTS get_scorecards_with_call_types();
CREATE OR REPLACE FUNCTION get_scorecards_with_call_types()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    target_call_types TEXT[],
    target_pipelines TEXT[],
    target_cadences TEXT[],
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
        s.target_call_types,
        s.target_pipelines,
        s.target_cadences,
        COALESCE((SELECT COUNT(*) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as criteria_count,
        COALESCE((SELECT SUM(sc.weight) FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id), 0) as total_weight
    FROM scorecards s
    ORDER BY s.created_at DESC;
$$;

SELECT 'Funções de scorecard corrigidas com sucesso!' as status;
