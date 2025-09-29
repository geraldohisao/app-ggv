-- 🔧 Corrigir problema de matching no callback do N8N
-- O callback procura por workflow_id, mas os registros são criados com workflow_id = NULL

-- 1. Verificar registros atuais e seus workflow_ids
SELECT 'REGISTROS ATUAIS E WORKFLOW_IDS:' as info;
SELECT 
    id,
    sdr,
    status,
    workflow_id,
    execution_id,
    created_at,
    (workflow_id IS NULL) as workflow_id_is_null
FROM public.reactivated_leads 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Atualizar registros pendentes para ter workflow_id correto
UPDATE public.reactivated_leads 
SET 
    workflow_id = 'Reativação de Leads',
    updated_at = NOW()
WHERE status = 'pending'
  AND workflow_id IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';

-- 3. Verificar se foram atualizados
SELECT 'APÓS CORREÇÃO DOS WORKFLOW_IDS:' as info;
SELECT 
    id,
    sdr,
    status,
    workflow_id,
    execution_id,
    created_at
FROM public.reactivated_leads 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. Criar função melhorada para callback que tenta múltiplos critérios
CREATE OR REPLACE FUNCTION update_reactivation_by_callback(
    p_workflow_id TEXT,
    p_status TEXT,
    p_message TEXT,
    p_leads_processed INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    updated_id BIGINT,
    method_used TEXT
) AS $$
DECLARE
    target_record_id BIGINT;
    update_method TEXT;
BEGIN
    -- Método 1: Tentar por workflow_id exato
    SELECT id INTO target_record_id
    FROM public.reactivated_leads 
    WHERE workflow_id = p_workflow_id
      AND status = 'pending'
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF target_record_id IS NOT NULL THEN
        update_method := 'workflow_id_match';
    ELSE
        -- Método 2: Tentar por registro mais recente pendente
        SELECT id INTO target_record_id
        FROM public.reactivated_leads 
        WHERE status = 'pending'
          AND created_at > NOW() - INTERVAL '30 minutes'
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF target_record_id IS NOT NULL THEN
            update_method := 'latest_pending';
        END IF;
    END IF;
    
    -- Se encontrou um registro, atualizar
    IF target_record_id IS NOT NULL THEN
        UPDATE public.reactivated_leads 
        SET 
            status = CASE 
                WHEN p_status = 'completed' THEN 'completed'
                WHEN p_status = 'failed' THEN 'failed'
                ELSE 'processing'
            END,
            count_leads = p_leads_processed,
            workflow_id = p_workflow_id,
            execution_id = 'callback_' || EXTRACT(EPOCH FROM NOW())::text,
            n8n_data = jsonb_build_object(
                'workflowId', p_workflow_id,
                'status', p_status,
                'message', p_message,
                'leadsProcessed', p_leads_processed,
                'webhookReceived', true,
                'webhookTime', NOW()::text,
                'callbackMethod', update_method
            ),
            updated_at = NOW()
        WHERE id = target_record_id;
        
        success := TRUE;
        updated_id := target_record_id;
        method_used := update_method;
    ELSE
        success := FALSE;
        updated_id := NULL;
        method_used := 'no_match_found';
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Testar a função melhorada com os dados reais do N8N
SELECT 'TESTANDO CALLBACK MELHORADO:' as info;
SELECT * FROM update_reactivation_by_callback(
    'Reativação de Leads',
    'completed',
    '2 lead(s) processados',
    2
);

-- 6. Verificar resultado
SELECT 'RESULTADO DO TESTE:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    workflow_id,
    (n8n_data->>'status') as n8n_status,
    (n8n_data->>'message') as n8n_message,
    (n8n_data->>'callbackMethod') as callback_method,
    updated_at
FROM public.reactivated_leads 
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC
LIMIT 3;

-- 7. Simular mais um callback para testar
SELECT 'SIMULANDO SEGUNDO CALLBACK:' as info;
SELECT * FROM update_reactivation_by_callback(
    'Reativação de Leads',
    'completed',
    '1 lead(s) processados',
    1
);

-- 8. Status final
SELECT 'STATUS FINAL:' as info;
SELECT 
    status,
    COUNT(*) as quantidade,
    string_agg(sdr, ', ') as sdrs_list
FROM public.reactivated_leads 
WHERE created_at::date = CURRENT_DATE
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'completed' THEN 1
        WHEN 'pending' THEN 2
        ELSE 3
    END;
