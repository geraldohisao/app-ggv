-- 🔧 Corrigir função get_reactivated_leads_history
-- Erro: structure of query does not match function result type

-- 1. Verificar estrutura atual da tabela
SELECT 'ESTRUTURA DA TABELA:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Dropar função problemática
DROP FUNCTION IF EXISTS get_reactivated_leads_history(integer, integer, text, text);

-- 3. Criar função corrigida com tipos corretos
CREATE OR REPLACE FUNCTION get_reactivated_leads_history(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE(
    id BIGINT,
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
) AS $$
DECLARE
    offset_val INTEGER;
    total_records BIGINT;
BEGIN
    -- Calcular offset
    offset_val := (p_page - 1) * p_limit;
    
    -- Calcular total de registros
    SELECT COUNT(*) INTO total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
      AND (p_status IS NULL OR rl.status = p_status);
    
    -- Retornar dados com tipos corretos
    RETURN QUERY
    SELECT 
        rl.id,
        rl.created_at,
        COALESCE(rl.sdr, '') as sdr,
        COALESCE(rl.filter, '') as filter,
        COALESCE(rl.status, 'pending') as status,
        COALESCE(rl.count_leads, 0) as count_leads,
        COALESCE(rl.cadence, '') as cadence,
        COALESCE(rl.workflow_id, '') as workflow_id,
        COALESCE(rl.execution_id, '') as execution_id,
        COALESCE(rl.n8n_data, '{}'::jsonb) as n8n_data,
        COALESCE(rl.error_message, '') as error_message,
        COALESCE(rl.updated_at, rl.created_at) as updated_at, -- Usar updated_at ou created_at
        total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
      AND (p_status IS NULL OR rl.status = p_status)
    ORDER BY rl.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 4. Testar a função corrigida
SELECT 'TESTE DA FUNÇÃO CORRIGIDA:' as info;
SELECT * FROM get_reactivated_leads_history(1, 5, NULL, NULL);

-- 5. Testar busca direta como comparação
SELECT 'BUSCA DIRETA PARA COMPARAÇÃO:' as info;
SELECT 
    id,
    created_at,
    sdr,
    filter,
    status,
    count_leads,
    cadence,
    workflow_id,
    execution_id,
    error_message,
    updated_at
FROM public.reactivated_leads 
ORDER BY created_at DESC 
LIMIT 5;
