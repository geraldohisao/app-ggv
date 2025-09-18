-- fix_smart_scorecard_selection.sql
-- Implementa seleção inteligente de scorecard baseada em especificidade

-- 1. Criar função de seleção inteligente de scorecard
CREATE OR REPLACE FUNCTION get_scorecard_smart(
    call_type_param TEXT,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    match_score INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH scorecard_matches AS (
        SELECT 
            s.id,
            s.name,
            s.description,
            s.active as is_active,
            s.created_at,
            -- Sistema de pontuação por especificidade
            (CASE 
                WHEN call_type_param = ANY(s.target_call_types) THEN 10 
                ELSE 0 
            END) +
            (CASE 
                WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 5 
                ELSE 0 
            END) +
            (CASE 
                WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 3 
                ELSE 0 
            END) +
            (CASE 
                WHEN s.active = true THEN 1 
                ELSE 0 
            END) as match_score
        FROM scorecards s
        WHERE s.active = true
        AND (
            -- Deve ter pelo menos um match de call_type OU ser um scorecard padrão (sem call_types específicos)
            call_type_param = ANY(s.target_call_types) 
            OR s.target_call_types IS NULL 
            OR array_length(s.target_call_types, 1) = 0
        )
    )
    SELECT 
        sm.id,
        sm.name,
        sm.description,
        sm.is_active,
        sm.match_score
    FROM scorecard_matches sm
    WHERE sm.match_score > 0
    ORDER BY 
        sm.match_score DESC,  -- Maior pontuação primeiro
        sm.created_at DESC    -- Mais recente como desempate
    LIMIT 1;
$$;

-- 2. Função alternativa para buscar múltiplos scorecards ranqueados
CREATE OR REPLACE FUNCTION get_scorecards_ranked(
    call_type_param TEXT,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL,
    limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    match_score INTEGER,
    match_details TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH scorecard_matches AS (
        SELECT 
            s.id,
            s.name,
            s.description,
            s.active as is_active,
            s.created_at,
            -- Sistema de pontuação por especificidade
            (CASE 
                WHEN call_type_param = ANY(s.target_call_types) THEN 10 
                ELSE 0 
            END) +
            (CASE 
                WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 5 
                ELSE 0 
            END) +
            (CASE 
                WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 3 
                ELSE 0 
            END) +
            (CASE 
                WHEN s.active = true THEN 1 
                ELSE 0 
            END) as match_score,
            -- Detalhes do match para debug
            CONCAT(
                CASE WHEN call_type_param = ANY(s.target_call_types) THEN 'call_type✓ ' ELSE '' END,
                CASE WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 'pipeline✓ ' ELSE '' END,
                CASE WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 'cadence✓ ' ELSE '' END,
                CASE WHEN s.active = true THEN 'active✓' ELSE '' END
            ) as match_details
        FROM scorecards s
        WHERE s.active = true
        AND (
            -- Deve ter pelo menos um match de call_type OU ser um scorecard padrão
            call_type_param = ANY(s.target_call_types) 
            OR s.target_call_types IS NULL 
            OR array_length(s.target_call_types, 1) = 0
        )
    )
    SELECT 
        sm.id,
        sm.name,
        sm.description,
        sm.is_active,
        sm.match_score,
        sm.match_details
    FROM scorecard_matches sm
    WHERE sm.match_score > 0
    ORDER BY 
        sm.match_score DESC,  -- Maior pontuação primeiro
        sm.created_at DESC    -- Mais recente como desempate
    LIMIT limit_param;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION get_scorecard_smart TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecards_ranked TO authenticated;

-- 4. Teste das funções
SELECT 'Testando seleção inteligente de scorecard...' as status;

-- Exemplo de teste (ajuste os valores conforme seus dados)
SELECT 
    name,
    match_score,
    match_details
FROM get_scorecards_ranked('consultoria', 'vendas', 'inbound', 3);

SELECT 'Funções de seleção inteligente criadas com sucesso!' as final_status;
