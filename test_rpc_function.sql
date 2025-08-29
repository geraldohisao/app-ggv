-- Testar se a função RPC está funcionando

-- 1. Verificar se a função existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_reactivated_leads_history';

-- 2. Testar a função RPC (se existir)
SELECT * FROM public.get_reactivated_leads_history(1, 10, NULL, NULL);

-- 3. Se a função não existir, vamos criar uma versão simples
CREATE OR REPLACE FUNCTION public.get_reactivated_leads_history_simple(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    created_at TIMESTAMPTZ,
    sdr TEXT,
    filter TEXT,
    status TEXT,
    count_leads INTEGER,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offset_val INTEGER;
    total_records BIGINT;
BEGIN
    offset_val := (p_page - 1) * p_limit;
    
    SELECT COUNT(*) INTO total_records FROM public.reactivated_leads;
    
    RETURN QUERY
    SELECT 
        rl.id,
        rl.created_at,
        rl.sdr,
        rl.filter,
        rl.status,
        rl.count_leads,
        total_records
    FROM public.reactivated_leads rl
    ORDER BY rl.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$;

-- 4. Testar a nova função
SELECT * FROM public.get_reactivated_leads_history_simple(1, 10);
