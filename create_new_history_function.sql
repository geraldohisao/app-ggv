-- Criar função de histórico adaptada à estrutura real da tabela

-- 1. Primeiro, vamos ver EXATAMENTE a estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Dropar função existente
DROP FUNCTION IF EXISTS public.get_reactivated_leads_history(integer,integer,text,text);

-- 3. Criar função simples baseada na estrutura real
CREATE OR REPLACE FUNCTION public.get_reactivated_leads_history(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    created_at DATE,  -- Mudado para DATE baseado no erro
    sdr TEXT,
    filter TEXT,
    status TEXT,
    count_leads INTEGER,
    cadence TEXT,
    workflow_id TEXT,
    execution_id TEXT,
    n8n_data JSONB,
    error_message TEXT,
    updated_at DATE,  -- Mudado para DATE também
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
    
    -- Contar total de registros
    SELECT COUNT(*) INTO total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status);
    
    -- Retornar dados
    RETURN QUERY
    SELECT 
        rl.id,
        rl.created_at,
        rl.sdr,
        rl.filter,
        rl.status,
        COALESCE(rl.count_leads, 0) as count_leads,
        COALESCE(rl.cadence, '') as cadence,
        COALESCE(rl.workflow_id, '') as workflow_id,
        COALESCE(rl.execution_id, '') as execution_id,
        COALESCE(rl.n8n_data, '{}'::jsonb) as n8n_data,
        COALESCE(rl.error_message, '') as error_message,
        rl.created_at as updated_at,  -- Usar created_at como updated_at
        total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status)
    ORDER BY rl.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$;

-- 4. Dar permissões
GRANT EXECUTE ON FUNCTION public.get_reactivated_leads_history(INTEGER, INTEGER, TEXT, TEXT) TO authenticated, service_role;

-- 5. Testar a função
SELECT * FROM public.get_reactivated_leads_history(1, 5, NULL, NULL);

-- 6. Testar filtros
SELECT * FROM public.get_reactivated_leads_history(1, 5, 'Andressa', NULL);
SELECT * FROM public.get_reactivated_leads_history(1, 5, NULL, 'completed');
