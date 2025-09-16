-- =========================================
-- ATUALIZAR FUNÇÃO get_calls COM STATUS VOIP E MAPEAMENTO
-- =========================================

-- 1. Remover função existente e criar nova função de mapeamento de status VOIP
DROP FUNCTION IF EXISTS public.map_status_voip(TEXT);
CREATE OR REPLACE FUNCTION public.map_status_voip(status_voip_input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN status_voip_input = 'normal_clearing' THEN 'Atendida'
        WHEN status_voip_input = 'originator_cancel' THEN 'Cancelada pela SDR'
        WHEN status_voip_input = 'no_answer' THEN 'Não atendida'
        WHEN status_voip_input = 'number_changed' THEN 'Numero mudou'
        ELSE COALESCE(status_voip_input, 'Status desconhecido')
    END;
$$;

-- 2. Remover função existente e recriar com novos campos
DROP FUNCTION IF EXISTS public.get_calls(INTEGER, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.get_calls(
    p_limit INTEGER DEFAULT 500,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH total AS (
        SELECT COUNT(*) as count 
        FROM calls 
        WHERE (p_status IS NULL OR status_voip = p_status)
    )
    SELECT 
        c.id,
        c.provider_call_id,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.status,
        c.status_voip,
        public.map_status_voip(c.status_voip) as status_voip_friendly,
        c.duration,
        c.created_at,
        t.count as total_count
    FROM calls c, total t
    WHERE (p_status IS NULL OR c.status_voip = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Dar permissões para as funções
GRANT EXECUTE ON FUNCTION public.map_status_voip(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_status_voip(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_calls(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls(INTEGER, INTEGER, TEXT) TO service_role;

-- =========================================
-- TESTES
-- =========================================

-- Ver distribuição de status VOIP
SELECT 
    status_voip,
    public.map_status_voip(status_voip) as status_amigavel,
    COUNT(*) as total
FROM calls 
GROUP BY status_voip, public.map_status_voip(status_voip)
ORDER BY total DESC;

-- Testar função atualizada (primeiros 5 registros)
SELECT 
    id,
    status_voip,
    status_voip_friendly,
    duration,
    created_at,
    total_count
FROM public.get_calls(5, 0, NULL)
ORDER BY created_at DESC;
