-- 🔧 CORREÇÃO: Seleção Inteligente de Scorecard por Etapa/Pipeline
-- Implementa priorização de scorecards baseada na etapa da chamada

-- 1. Atualizar função get_call_detail para incluir pipeline/etapa
DROP FUNCTION IF EXISTS public.get_call_detail CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_detail(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    audio_url TEXT,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- NOVOS CAMPOS PARA SELEÇÃO INTELIGENTE
    pipeline TEXT,  -- Etapa do pipeline (ex: "Apresentação de Proposta")
    cadence TEXT,   -- Cadência da chamada
    deal_stage TEXT -- Estágio do deal
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        c.company_name,
        c.person_name,
        c.person_email,
        c.sdr_id,
        c.sdr_name,
        c.sdr_email,
        c.sdr_avatar_url,
        c.status,
        c.status_voip,
        c.status_voip_friendly,
        c.duration,
        c.duration_formated,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        c.audio_url,
        c.transcription,
        c.insights,
        c.scorecard,
        c.agent_id,
        c.created_at,
        c.updated_at,
        -- Extrair pipeline/etapa do deal_id via Pipedrive
        COALESCE(
            (c.insights->>'pipeline')::TEXT,
            (c.insights->>'deal_stage')::TEXT,
            (c.insights->>'stage')::TEXT,
            'N/A'
        ) as pipeline,
        -- Extrair cadência
        COALESCE(
            (c.insights->>'cadence')::TEXT,
            (c.insights->>'sequence')::TEXT,
            'N/A'
        ) as cadence,
        -- Extrair estágio do deal
        COALESCE(
            (c.insights->>'deal_stage')::TEXT,
            (c.insights->>'stage')::TEXT,
            'N/A'
        ) as deal_stage
    FROM calls c
    WHERE c.id = p_call_id;
$$;

-- 2. Atualizar função get_scorecard_smart para priorizar por pipeline/etapa
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
            -- SISTEMA DE PONTUAÇÃO PRIORIZANDO PIPELINE/ETAPA
            (CASE 
                WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 20  -- MAIOR PRIORIDADE
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
            END) as match_score
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
        sm.match_score
    FROM scorecard_matches sm
    WHERE sm.match_score > 0
    ORDER BY 
        sm.match_score DESC,  -- Maior pontuação primeiro (pipeline tem prioridade)
        sm.created_at DESC    -- Mais recente como desempate
    LIMIT 1;
$$;

-- 3. Função de debug para verificar seleção
CREATE OR REPLACE FUNCTION public.debug_scorecard_selection(
    call_type_param TEXT,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    match_score INTEGER,
    match_details TEXT,
    target_pipelines TEXT[],
    target_call_types TEXT[]
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
            -- Sistema de pontuação
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
            -- Detalhes do match
            CONCAT(
                CASE WHEN pipeline_param IS NOT NULL AND pipeline_param = ANY(s.target_pipelines) THEN 'pipeline✓ ' ELSE '' END,
                CASE WHEN call_type_param = ANY(s.target_call_types) THEN 'call_type✓ ' ELSE '' END,
                CASE WHEN cadence_param IS NOT NULL AND cadence_param = ANY(s.target_cadences) THEN 'cadence✓ ' ELSE '' END,
                CASE WHEN s.active = true THEN 'active✓' ELSE '' END
            ) as match_details
        FROM scorecards s
        WHERE s.active = true
    )
    SELECT 
        sm.id,
        sm.name,
        sm.match_score,
        sm.match_details,
        sm.target_pipelines,
        sm.target_call_types
    FROM scorecard_matches sm
    WHERE sm.match_score > 0
    ORDER BY sm.match_score DESC;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_call_detail(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_scorecard_smart(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.debug_scorecard_selection(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 5. Teste da correção
SELECT 'Correção de seleção inteligente por pipeline implementada!' as status;

-- Exemplo de teste (ajuste conforme seus dados)
SELECT 
    name,
    match_score,
    match_details
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');
