-- 🔧 CORREÇÃO AVANÇADA: Seleção Inteligente com Desempate Adequado
-- Resolve problemas de múltiplos scorecards para mesma etapa

-- 1. Função aprimorada com desempate inteligente
DROP FUNCTION IF EXISTS public.get_scorecard_smart CASCADE;

CREATE OR REPLACE FUNCTION public.get_scorecard_smart(
    call_type_param TEXT,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    is_active BOOLEAN,
    match_score INTEGER,
    specificity_score INTEGER
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
            -- SISTEMA DE PONTUAÇÃO PRINCIPAL
            (CASE 
                WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 20
                ELSE 0 
            END) +
            (CASE 
                WHEN call_type_param = ANY(s.target_call_types) THEN 10 
                ELSE 0 
            END) +
            (CASE 
                WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 5 
                ELSE 0 
            END) +
            (CASE 
                WHEN s.active = true THEN 1 
                ELSE 0 
            END) as match_score,
            -- PONTUAÇÃO DE ESPECIFICIDADE (desempate inteligente)
            (
                -- Mais específico = maior pontuação
                COALESCE(array_length(s.target_pipelines, 1), 0) * 2 +  -- Mais pipelines = mais específico
                COALESCE(array_length(s.target_call_types, 1), 0) * 1 +  -- Mais call_types = mais específico
                COALESCE(array_length(s.target_cadences, 1), 0) * 1 +    -- Mais cadences = mais específico
                -- Penalizar scorecards muito genéricos (sem configurações específicas)
                CASE 
                    WHEN s.target_pipelines IS NULL OR array_length(s.target_pipelines, 1) = 0 THEN -5
                    ELSE 0 
                END +
                CASE 
                    WHEN s.target_call_types IS NULL OR array_length(s.target_call_types, 1) = 0 THEN -3
                    ELSE 0 
                END
            ) as specificity_score
        FROM scorecards s
        WHERE s.active = true
        AND (
            -- Deve ter match de pipeline OU call_type OU ser padrão
            (pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines))
            OR call_type_param = ANY(s.target_call_types) 
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
        sm.specificity_score
    FROM scorecard_matches sm
    WHERE sm.match_score > 0
    ORDER BY 
        sm.match_score DESC,        -- Maior pontuação principal primeiro
        sm.specificity_score DESC   -- Maior especificidade como desempate
    LIMIT 1;
$$;

-- 2. Função de debug aprimorada
DROP FUNCTION IF EXISTS public.debug_scorecard_selection CASCADE;

CREATE OR REPLACE FUNCTION public.debug_scorecard_selection(
    call_type_param TEXT,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    match_score INTEGER,
    specificity_score INTEGER,
    match_details TEXT,
    target_pipelines TEXT[],
    target_call_types TEXT[],
    target_cadences TEXT[],
    ranking_position INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH scorecard_matches AS (
        SELECT 
            s.id,
            s.name,
            s.target_pipelines,
            s.target_call_types,
            s.target_cadences,
            -- Sistema de pontuação principal
            (CASE 
                WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 20
                ELSE 0 
            END) +
            (CASE 
                WHEN call_type_param = ANY(s.target_call_types) THEN 10 
                ELSE 0 
            END) +
            (CASE 
                WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 5 
                ELSE 0 
            END) +
            (CASE 
                WHEN s.active = true THEN 1 
                ELSE 0 
            END) as match_score,
            -- Pontuação de especificidade
            (
                COALESCE(array_length(s.target_pipelines, 1), 0) * 2 +
                COALESCE(array_length(s.target_call_types, 1), 0) * 1 +
                COALESCE(array_length(s.target_cadences, 1), 0) * 1 +
                CASE 
                    WHEN s.target_pipelines IS NULL OR array_length(s.target_pipelines, 1) = 0 THEN -5
                    ELSE 0 
                END +
                CASE 
                    WHEN s.target_call_types IS NULL OR array_length(s.target_call_types, 1) = 0 THEN -3
                    ELSE 0 
                END
            ) as specificity_score,
            -- Detalhes do match
            CONCAT(
                CASE WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 'pipeline✓ ' ELSE '' END,
                CASE WHEN call_type_param = ANY(s.target_call_types) THEN 'call_type✓ ' ELSE '' END,
                CASE WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 'cadence✓ ' ELSE '' END,
                CASE WHEN s.active = true THEN 'active✓' ELSE '' END
            ) as match_details
        FROM scorecards s
        WHERE s.active = true
    ),
    ranked_matches AS (
        SELECT 
            sm.*,
        ROW_NUMBER() OVER (
            ORDER BY 
                sm.match_score DESC,
                sm.specificity_score DESC
        ) as ranking_position
        FROM scorecard_matches sm
        WHERE sm.match_score > 0
    )
    SELECT 
        rm.id,
        rm.name,
        rm.match_score,
        rm.specificity_score,
        rm.match_details,
        rm.target_pipelines,
        rm.target_call_types,
        rm.target_cadences,
        rm.ranking_position
    FROM ranked_matches rm
    ORDER BY rm.ranking_position;
$$;

-- 3. Função para verificar conflitos de scorecards
CREATE OR REPLACE FUNCTION public.check_scorecard_conflicts()
RETURNS TABLE (
    pipeline TEXT,
    conflict_count BIGINT,
    scorecards TEXT[],
    recommendation TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH pipeline_conflicts AS (
        SELECT 
            unnest(target_pipelines) as pipeline,
            COUNT(*) as conflict_count,
            ARRAY_AGG(name ORDER BY name) as scorecards
        FROM scorecards 
        WHERE active = true 
        AND target_pipelines IS NOT NULL 
        AND array_length(target_pipelines, 1) > 0
        GROUP BY unnest(target_pipelines)
        HAVING COUNT(*) > 1
    )
    SELECT 
        pc.pipeline,
        pc.conflict_count,
        pc.scorecards,
        CASE 
            WHEN pc.conflict_count = 2 THEN 'Verificar especificidade dos scorecards'
            WHEN pc.conflict_count > 2 THEN 'Considerar consolidar scorecards similares'
            ELSE 'Sem conflitos'
        END as recommendation
    FROM pipeline_conflicts pc
    ORDER BY pc.conflict_count DESC;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_scorecard_smart(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.debug_scorecard_selection(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.check_scorecard_conflicts() TO authenticated, anon, service_role;

-- 5. Teste da correção
SELECT 'Sistema de seleção aprimorado implementado!' as status;

-- Verificar conflitos existentes
SELECT 'Verificando conflitos de scorecards:' as info;
SELECT * FROM check_scorecard_conflicts();

-- Teste com múltiplos scorecards para mesma etapa
SELECT 'Testando seleção para "Apresentação de Proposta" (múltiplos scorecards):' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');
