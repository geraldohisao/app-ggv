-- Corrigir a função RPC existente para funcionar com a estrutura real da tabela

-- 1. Primeiro, vamos ver exatamente quais colunas existem
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Recriar a função com apenas as colunas que existem
CREATE OR REPLACE FUNCTION public.get_reactivated_leads_history(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    created_at TIMESTAMPTZ,
    sdr TEXT,
    filter TEXT,
    status TEXT,
    count_leads INTEGER,
    cadence TEXT,
    workflow_id TEXT,
    execution_id TEXT,
    n8n_data JSONB,
    error_message TEXT,
    updated_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    offset_val INTEGER;
    total_records BIGINT;
BEGIN
    offset_val := (p_page - 1) * p_limit;
    
    SELECT COUNT(*) INTO total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status);
    
    RETURN QUERY
    SELECT 
        rl.id,
        rl.created_at,
        rl.sdr,
        rl.filter,
        rl.status,
        rl.count_leads,
        COALESCE(rl.cadence, '') as cadence,
        COALESCE(rl.workflow_id, '') as workflow_id,
        COALESCE(rl.execution_id, '') as execution_id,
        COALESCE(rl.n8n_data, '{}'::jsonb) as n8n_data,
        COALESCE(rl.error_message, '') as error_message,
        rl.created_at as updated_at, -- Usar created_at como updated_at se não existir
        total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status)
    ORDER BY rl.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$;

-- 3. Testar a função corrigida
SELECT * FROM public.get_reactivated_leads_history(1, 5, NULL, NULL);
