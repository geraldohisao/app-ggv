-- =========================================
-- CRIAR FUNÇÃO MÍNIMA PARA TESTE
-- =========================================

-- 1. Remover TODAS as versões existentes
DROP FUNCTION IF EXISTS public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_calls_with_filters();

-- 2. Criar função mínima apenas com status_voip_friendly
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 500,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    status_voip TEXT,
    status_voip_friendly TEXT,
    enterprise TEXT,
    person TEXT,
    duration INTEGER,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH total AS (
        SELECT COUNT(*) as count 
        FROM calls c
        WHERE (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
          AND (p_status IS NULL OR c.status_voip = p_status)
          AND (p_call_type IS NULL OR c.call_type = p_call_type)
          AND (p_start_date IS NULL OR c.created_at >= p_start_date)
          AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    )
    SELECT 
        c.id,
        c.status_voip,
        public.map_status_voip(c.status_voip) as status_voip_friendly,
        c.enterprise,
        c.person,
        c.duration,
        t.count as total_count
    FROM calls c, total t
    WHERE (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
      AND (p_status IS NULL OR c.status_voip = p_status)
      AND (p_call_type IS NULL OR c.call_type = p_call_type)
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 3. Dar permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO service_role;
