-- 🔍 Verificar função get_reactivated_leads_history
-- Por que não está mostrando todos os dados da tabela?

-- 1. Verificar se a função existe
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_reactivated_leads_history';

-- 2. Ver definição da função
SELECT routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_reactivated_leads_history';

-- 3. Testar busca direta na tabela (sem função)
SELECT 'BUSCA DIRETA NA TABELA:' as info;
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
LIMIT 10;

-- 4. Testar a função RPC
SELECT 'TESTE DA FUNÇÃO RPC:' as info;
SELECT * FROM get_reactivated_leads_history(1, 10, NULL, NULL);

-- 5. Comparar contagens
SELECT 'CONTAGEM TOTAL NA TABELA:' as info;
SELECT COUNT(*) as total_records FROM public.reactivated_leads;

SELECT 'CONTAGEM POR STATUS:' as info;
SELECT 
    status,
    COUNT(*) as quantidade
FROM public.reactivated_leads 
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'completed' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'failed' THEN 3
        ELSE 4
    END;
