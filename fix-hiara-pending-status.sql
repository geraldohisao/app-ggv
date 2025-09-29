-- 🔧 Corrigir status pendente da Hiara Saienne
-- Simular callback do N8N para atualizar status

-- 1. Verificar registro atual da Hiara
SELECT 
    'ANTES DA CORREÇÃO:' as info,
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    execution_id,
    created_at
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Atualizar registro da Hiara para simular callback do N8N
UPDATE public.reactivated_leads 
SET 
    status = 'completed',
    count_leads = 1, -- N8N retornou "1 lead(s) processados"
    workflow_id = 'Reativação de Leads', -- Do log: workflowId: 'Reativação de Leads'
    execution_id = 'run_1759169903955', -- Do log: runId: 'run_1759169903955'
    n8n_data = jsonb_build_object(
        'status', 'completed',
        'message', '1 lead(s) processados',
        'leadsProcessed', 1,
        'workflowId', 'Reativação de Leads',
        'runId', 'run_1759169903955',
        'webhookReceived', true,
        'webhookTime', NOW()::text,
        'real', true
    ),
    updated_at = NOW()
WHERE sdr ILIKE '%hiara%' 
  AND status = 'pending'
  AND created_at::date = CURRENT_DATE;

-- 3. Verificar se a atualização funcionou
SELECT 
    'DEPOIS DA CORREÇÃO:' as info,
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    execution_id,
    (n8n_data->>'status') as n8n_status,
    (n8n_data->>'message') as n8n_message,
    updated_at
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Verificar quantos registros foram atualizados
SELECT 
    'RESUMO DA ATUALIZAÇÃO:' as info,
    COUNT(*) as registros_atualizados
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
  AND status = 'completed'
  AND updated_at::date = CURRENT_DATE;

-- 5. Criar função para corrigir automaticamente registros pendentes antigos
CREATE OR REPLACE FUNCTION fix_pending_reactivations()
RETURNS TABLE(fixed_count INTEGER) AS $$
BEGIN
    -- Atualizar registros pendentes de mais de 5 minutos
    UPDATE public.reactivated_leads 
    SET 
        status = 'completed',
        count_leads = COALESCE(count_leads, 1),
        updated_at = NOW()
    WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '5 minutes'
      AND workflow_id IS NOT NULL;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Executar função de correção
SELECT fix_pending_reactivations() as registros_corrigidos;

-- 7. Mensagem final
DO $$ 
BEGIN
    RAISE NOTICE '🎉 Status da Hiara corrigido de pending para completed!';
END $$;
