-- 🔧 CORRIGIR: Função get_calls_with_filters para implementar filtro de nota mínima
-- Este script corrige a função para usar o parâmetro p_min_score

-- 1. Verificar função atual
SELECT '1. Função atual:' as info;
SELECT 
    proname,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Recriar função com filtro de nota mínima
DROP FUNCTION IF EXISTS get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_min_score NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    enterprise TEXT,
    person TEXT,
    agent_id TEXT,
    call_type TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.enterprise,
        c.person,
        c.agent_id,
        c.call_type,
        c.duration,
        c.created_at
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        (p_sdr IS NULL OR c.agent_id = p_sdr)
        AND (p_status IS NULL OR c.status = p_status)
        AND (p_type IS NULL OR c.call_type = p_type)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
        AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
        AND (p_min_score IS NULL OR ca.final_grade >= p_min_score) -- ✅ FILTRO DE NOTA MÍNIMA
    ORDER BY 
        CASE WHEN p_sort_by = 'created_at' THEN c.created_at END DESC,
        CASE WHEN p_sort_by = 'duration' THEN c.duration END DESC,
        CASE WHEN p_sort_by = 'score' THEN ca.final_grade END DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO service_role;

-- 4. Testar função corrigida
SELECT '2. Testando função corrigida:' as info;
SELECT 
    'Sem filtro' as tipo,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 100, 0, 'created_at', null, null, null
)
UNION ALL
SELECT 
    'Com filtro min_score=8' as tipo,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 100, 0, 'created_at', null, null, 8.0
);
