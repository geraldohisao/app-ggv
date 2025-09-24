-- CRIAR_FUNCOES_FALTANTES.sql
-- Script para criar as funções que estão faltando

-- =========================================
-- ETAPA 1: FUNÇÃO PARA BUSCAR TRANSCRIÇÕES POR DEAL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_transcriptions(p_deal_id TEXT)
RETURNS TABLE (
    call_id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    direction TEXT,
    call_type TEXT,
    duration INTEGER,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    created_at TIMESTAMPTZ,
    call_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id as call_id,
        provider_call_id,
        from_number,
        to_number,
        agent_id,
        direction,
        call_type,
        duration,
        transcription,
        insights,
        scorecard,
        created_at,
        status as call_status
    FROM calls 
    WHERE deal_id = p_deal_id
      AND transcription IS NOT NULL 
      AND transcription != ''
      AND status = 'processed'
    ORDER BY created_at ASC;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_transcriptions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_transcriptions(TEXT) TO service_role;

-- =========================================
-- ETAPA 2: FUNÇÃO PARA ESTATÍSTICAS DO DEAL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_call_stats(p_deal_id TEXT)
RETURNS TABLE (
    total_calls BIGINT,
    total_duration INTEGER,
    avg_duration NUMERIC,
    successful_calls BIGINT,
    first_call_date TIMESTAMPTZ,
    last_call_date TIMESTAMPTZ,
    call_types JSONB,
    agents_involved JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH call_stats AS (
        SELECT 
            COUNT(*) as total_calls,
            COALESCE(SUM(duration), 0) as total_duration,
            COALESCE(AVG(duration), 0) as avg_duration,
            COUNT(*) FILTER (WHERE status = 'processed' AND transcription IS NOT NULL) as successful_calls,
            MIN(created_at) as first_call_date,
            MAX(created_at) as last_call_date
        FROM calls 
        WHERE deal_id = p_deal_id
    ),
    call_types_stats AS (
        SELECT 
            COALESCE(jsonb_object_agg(call_type, call_count), '{}'::jsonb) as call_types
        FROM (
            SELECT 
                call_type,
                COUNT(*) as call_count
            FROM calls 
            WHERE deal_id = p_deal_id
              AND call_type IS NOT NULL
            GROUP BY call_type
        ) ct
    ),
    agents_stats AS (
        SELECT 
            COALESCE(jsonb_object_agg(agent_id, agent_count), '{}'::jsonb) as agents_involved
        FROM (
            SELECT 
                agent_id,
                COUNT(*) as agent_count
            FROM calls 
            WHERE deal_id = p_deal_id
              AND agent_id IS NOT NULL
            GROUP BY agent_id
        ) ag
    )
    SELECT 
        cs.total_calls,
        cs.total_duration,
        cs.avg_duration,
        cs.successful_calls,
        cs.first_call_date,
        cs.last_call_date,
        cts.call_types,
        ags.agents_involved
    FROM call_stats cs
    CROSS JOIN call_types_stats cts
    CROSS JOIN agents_stats ags;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_call_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_call_stats(TEXT) TO service_role;

-- =========================================
-- ETAPA 3: FUNÇÃO PARA SALVAR ANÁLISE PERMANENTE
-- =========================================

CREATE OR REPLACE FUNCTION public.save_analysis_permanent(
    p_deal_id TEXT,
    p_analysis_content TEXT,
    p_transcription_summary TEXT,
    p_call_count INTEGER,
    p_total_duration INTEGER,
    p_custom_prompt TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    analysis_id UUID;
BEGIN
    INSERT INTO call_analysis_history (
        deal_id,
        analysis_type,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        ai_persona_id
    ) VALUES (
        p_deal_id,
        'comprehensive',
        p_analysis_content,
        p_transcription_summary,
        p_call_count,
        p_total_duration,
        p_custom_prompt,
        'call_analyst'
    ) RETURNING id INTO analysis_id;
    
    RETURN analysis_id;
END;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.save_analysis_permanent(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_analysis_permanent(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;

-- =========================================
-- ETAPA 4: FUNÇÃO PARA BUSCAR ÚLTIMA ANÁLISE
-- =========================================

CREATE OR REPLACE FUNCTION public.get_latest_analysis(p_deal_id TEXT)
RETURNS TABLE (
    id UUID,
    analysis_content TEXT,
    transcription_summary TEXT,
    call_count INTEGER,
    total_duration INTEGER,
    custom_prompt TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        created_at
    FROM call_analysis_history 
    WHERE deal_id = p_deal_id
    ORDER BY created_at DESC
    LIMIT 1;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_latest_analysis(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_analysis(TEXT) TO service_role;

-- =========================================
-- ETAPA 5: FUNÇÃO PARA BUSCAR HISTÓRICO COMPLETO
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_analysis_history(p_deal_id TEXT)
RETURNS TABLE (
    id UUID,
    analysis_type TEXT,
    analysis_content TEXT,
    transcription_summary TEXT,
    call_count INTEGER,
    total_duration INTEGER,
    custom_prompt TEXT,
    ai_persona_id TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        analysis_type,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        ai_persona_id,
        created_at
    FROM call_analysis_history 
    WHERE deal_id = p_deal_id
    ORDER BY created_at DESC;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_analysis_history(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_analysis_history(TEXT) TO service_role;

-- =========================================
-- ETAPA 6: VERIFICAR SE TUDO FOI CRIADO
-- =========================================

SELECT 
    'get_deal_transcriptions' as funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_transcriptions') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'get_deal_call_stats' as funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_call_stats') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'save_analysis_permanent' as funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_analysis_permanent') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'get_latest_analysis' as funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_latest_analysis') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'get_deal_analysis_history' as funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_analysis_history') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;
