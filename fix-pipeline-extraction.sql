-- 🔧 CORREÇÃO: Extrair pipeline/etapa corretamente
-- O problema é que o sistema está extraindo nome da empresa ao invés da etapa

-- 1. Verificar função get_call_detail atual
SELECT 'Verificando função get_call_detail:' as info;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_call_detail'
AND routine_schema = 'public';

-- 2. Atualizar função get_call_detail para extrair etapa corretamente
DROP FUNCTION IF EXISTS public.get_call_detail CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_detail(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    status TEXT,
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
    -- CORREÇÃO: Extrair pipeline/etapa corretamente
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
        c.status,
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
        -- CORREÇÃO: Priorizar call_type como pipeline quando for etapa específica
        CASE 
            -- Se call_type é uma etapa específica, usar como pipeline
            WHEN c.call_type IN ('Apresentação de Proposta', 'Qualificação', 'Descoberta de Necessidades', 'Agendamento', 'Follow-up') 
            THEN c.call_type
            -- Senão, tentar extrair de insights
            ELSE COALESCE(
                (c.insights->>'pipeline')::TEXT,
                (c.insights->>'deal_stage')::TEXT,
                (c.insights->>'stage')::TEXT,
                'N/A'
            )
        END as pipeline,
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

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_call_detail(UUID) TO authenticated, anon, service_role;

-- 4. Testar função corrigida
SELECT 'Testando função get_call_detail corrigida:' as info;

-- Testar com uma chamada real
SELECT 
    id,
    call_type,
    pipeline,
    cadence,
    deal_stage
FROM get_call_detail('495aca80-b525-41e6-836e-0e9208e6c73b'::UUID);

-- 5. Testar seleção de scorecard com pipeline corrigido
SELECT 'Testando seleção com pipeline corrigido:' as info;

-- Simular chamada com call_type = "Apresentação de Proposta"
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection(
    'Apresentação de Proposta',  -- call_type (etapa)
    'Apresentação de Proposta',  -- pipeline (mesmo que call_type)
    'inbound'  -- cadence
);

-- 6. Verificar se scorecards estão configurados corretamente
SELECT 'Scorecards configurados:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 7. Teste final
SELECT 'RESULTADO FINAL - Pipeline deve ser extraído corretamente:' as info;

-- Se call_type = "Apresentação de Proposta" → pipeline = "Apresentação de Proposta"
-- Se call_type = "consultoria" → pipeline = extraído de insights
SELECT 
    'Apresentação de Proposta' as call_type_teste,
    'Apresentação de Proposta' as pipeline_teste,
    name as scorecard_selecionado,
    match_score,
    specificity_score,
    target_pipelines
FROM debug_scorecard_selection('Apresentação de Proposta', 'Apresentação de Proposta', 'inbound')
LIMIT 1;
