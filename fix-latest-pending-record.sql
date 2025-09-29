-- 🔧 Corrigir registro pendente mais recente da Lô-Ruama
-- Baseado no teste com 1 lead e retorno de sucesso do N8N

-- 1. Verificar registro pendente atual da Lô-Ruama
SELECT 'REGISTRO PENDENTE ATUAL:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    execution_id,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE sdr = 'Lô-Ruama Oliveira'
  AND status = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Atualizar o registro mais recente da Lô-Ruama
UPDATE public.reactivated_leads 
SET 
    status = 'completed',
    count_leads = 1, -- Testou com 1 lead
    workflow_id = 'Reativação de Leads',
    execution_id = 'run_' || EXTRACT(EPOCH FROM NOW())::text,
    n8n_data = jsonb_build_object(
        'workflowId', 'Reativação de Leads',
        'status', 'completed',
        'message', '1 lead(s) processados',
        'leadsProcessed', 1,
        'webhookReceived', true,
        'webhookTime', NOW()::text,
        'real', true,
        'source', 'manual_correction'
    ),
    updated_at = NOW()
WHERE sdr = 'Lô-Ruama Oliveira'
  AND status = 'pending'
  AND id = (
      SELECT id FROM public.reactivated_leads 
      WHERE sdr = 'Lô-Ruama Oliveira' 
        AND status = 'pending'
      ORDER BY created_at DESC 
      LIMIT 1
  );

-- 3. Verificar se foi corrigido
SELECT 'APÓS CORREÇÃO:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    (n8n_data->>'status') as n8n_status,
    (n8n_data->>'message') as n8n_message,
    (n8n_data->>'leadsProcessed')::int as leads_processados,
    updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Lô-Ruama Oliveira'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Verificar se ainda há registros pendentes
SELECT 'REGISTROS PENDENTES RESTANTES:' as info;
SELECT 
    COUNT(*) as total_pendentes,
    string_agg(DISTINCT sdr, ', ') as sdrs_pendentes
FROM public.reactivated_leads 
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '2 hours';
