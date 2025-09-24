-- CORRIGIR_TIPO_FUNCAO_CALLS.sql
-- 🔧 Corrigir erro de tipo na função get_calls_with_filters

-- ===================================================================
-- PROBLEMA: "Returned type uuid does not match expected type text in column 5"
-- SOLUÇÃO: Ajustar tipos de retorno da função para corresponder ao que o frontend espera
-- ===================================================================

-- 1. Primeiro, vamos ver qual função está causando problema
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'get_calls_with_filters';

-- 2. Dropar todas as versões da função para evitar conflitos
DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

-- 3. Recriar a função com tipos corretos
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_sort_by text DEFAULT 'created_at',
    p_min_duration integer DEFAULT NULL,
    p_max_duration integer DEFAULT NULL,
    p_min_score numeric DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,  -- MUDANÇA: UUID para TEXT
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,  -- MUDANÇA: coluna 5 - era UUID, agora TEXT
    sdr_id TEXT,    -- MUDANÇA: UUID para TEXT 
    deal_id TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    created_at TIMESTAMPTZ,
    transcription TEXT,
    insights JSONB,
    pipeline TEXT,
    cadence TEXT,
    enterprise TEXT,
    person TEXT,
    sdr TEXT,
    sdr_name TEXT,
    company TEXT,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered_calls AS (
        SELECT 
            c.id::TEXT as id,  -- Converter UUID para TEXT
            c.provider_call_id,
            c.from_number,
            c.to_number,
            c.agent_id,
            c.sdr_id::TEXT as sdr_id,  -- Converter UUID para TEXT
            c.deal_id,
            c.status,
            COALESCE(c.insights->>'status_voip', 'normal_clearing') as status_voip,
            COALESCE(c.insights->>'status_voip_friendly', 'Atendida') as status_voip_friendly,
            c.duration,
            -- Usar a COLUNA REAL da tabela calls (duration_formated), com fallback opcional do insights
            COALESCE(c.duration_formated, c.insights->>'duration_formated') as duration_formated,
            c.call_type,
            c.direction,
            c.created_at,
            c.transcription,
            c.insights,
            COALESCE(c.insights->>'pipeline', 'Default') as pipeline,
            COALESCE(c.insights->>'cadence', 'Default') as cadence,
            COALESCE(c.insights->>'enterprise', c.insights->>'company') as enterprise,
            COALESCE(c.insights->>'person', c.insights->>'person_name') as person,
            COALESCE(c.insights->>'sdr', c.agent_id) as sdr,
            COALESCE(c.insights->>'sdr_name', c.agent_id) as sdr_name,
            COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') as company
        FROM calls c
        WHERE 
            -- Filtros opcionais
            (p_sdr IS NULL OR c.agent_id = p_sdr OR c.insights->>'sdr_name' = p_sdr)
            AND (p_status IS NULL OR c.status = p_status)
            AND (p_type IS NULL OR c.call_type = p_type)
            AND (p_start_date IS NULL OR c.created_at >= p_start_date)
            AND (p_end_date IS NULL OR c.created_at <= p_end_date)
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
    ),
    total_count AS (
        SELECT COUNT(*) as count FROM filtered_calls
    )
    SELECT 
        fc.*,
        tc.count as total_count
    FROM filtered_calls fc, total_count tc
    ORDER BY 
        CASE 
            WHEN p_sort_by = 'created_at' THEN fc.created_at
            ELSE fc.created_at
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 4. Dar permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(
    text, text, text, timestamptz, timestamptz, integer, integer, text, integer, integer, numeric
) TO authenticated, anon;

-- 5. Verificar se a função foi criada corretamente
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'get_calls_with_filters';

-- 6. Testar a função
SELECT COUNT(*) as total_calls_returned
FROM get_calls_with_filters(
    p_limit := 10
);

SELECT '🔧 FUNÇÃO CORRIGIDA!' as status;
SELECT '📊 Agora teste o painel - erro de tipo deve estar resolvido' as resultado;
SELECT '⚡ Recarregue a página e clique em Atualizar' as proximos_passos;
