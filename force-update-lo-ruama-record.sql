-- 🚨 CORREÇÃO FORÇADA: Atualizar registro da Lô-Ruama que está com 0 leads
-- Problema: Executou com 1 lead mas histórico mostra 0 leads

-- 1. Verificar registro atual da Lô-Ruama (mais recente)
SELECT 'REGISTRO ATUAL DA LÔ-RUAMA (MAIS RECENTE):' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    execution_id,
    created_at,
    updated_at,
    (n8n_data->>'leadsProcessed') as n8n_leads_processed,
    (n8n_data->>'message') as n8n_message,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE sdr = 'Lô-Ruama Oliveira'
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Forçar atualização do registro mais recente da Lô-Ruama
-- Usar dados corretos: 1 lead processado, status completed
UPDATE public.reactivated_leads 
SET 
    status = 'completed',
    count_leads = 1, -- CORRIGIR PARA 1 LEAD
    workflow_id = 'Reativação de Leads',
    execution_id = 'run_force_' || EXTRACT(EPOCH FROM NOW())::text,
    n8n_data = jsonb_build_object(
        'workflowId', 'Reativação de Leads',
        'status', 'completed',
        'message', '1 lead(s) processados',
        'leadsProcessed', 1, -- IMPORTANTE: 1 lead
        'webhookReceived', true,
        'webhookTime', NOW()::text,
        'real', true,
        'source', 'force_correction_' || NOW()::text,
        'corrected_at', NOW()::text,
        'original_issue', 'showing_0_leads_instead_of_1'
    ),
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM public.reactivated_leads 
    WHERE sdr = 'Lô-Ruama Oliveira'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 3. Verificar se a correção funcionou
SELECT 'APÓS CORREÇÃO FORÇADA:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads, -- DEVE MOSTRAR 1
    workflow_id,
    execution_id,
    (n8n_data->>'status') as n8n_status,
    (n8n_data->>'message') as n8n_message,
    (n8n_data->>'leadsProcessed')::int as n8n_leads_processed, -- DEVE MOSTRAR 1
    (n8n_data->>'source') as correction_source,
    updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Lô-Ruama Oliveira'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Verificar se há outros registros pendentes que precisam ser corrigidos
SELECT 'OUTROS REGISTROS PENDENTES:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '3 hours'
ORDER BY created_at DESC;

-- 5. Confirmar quantos registros completed existem hoje
SELECT 'RESUMO DE HOJE:' as info;
SELECT 
    status,
    COUNT(*) as quantidade,
    SUM(count_leads) as total_leads_processados,
    string_agg(DISTINCT sdr, ', ') as sdrs
FROM public.reactivated_leads 
WHERE created_at::date = CURRENT_DATE
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'completed' THEN 1
        WHEN 'pending' THEN 2
        ELSE 3
    END;

-- 6. Verificar se o frontend vai mostrar corretamente
SELECT 'DADOS QUE O FRONTEND VAI RECEBER:' as info;
SELECT 
    sdr as "SDR",
    CASE 
        WHEN status = 'completed' THEN 'Concluído'
        WHEN status = 'pending' THEN 'Pendente'
        WHEN status = 'processing' THEN 'Processando'
        ELSE 'Desconhecido'
    END as "Status",
    count_leads as "Leads Processados",
    TO_CHAR(created_at, 'DD/MM/YYYY, HH24:MI') || ' UTC' as "Data",
    filter as "Filtro"
FROM public.reactivated_leads 
WHERE sdr = 'Lô-Ruama Oliveira'
ORDER BY created_at DESC 
LIMIT 3;
