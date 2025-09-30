-- 🔍 Debug: Por que produção não está salvando leads corretos
-- Verificar registro mais recente da Andressa

-- 1. Verificar o registro mais recente da Andressa
SELECT 'REGISTRO MAIS RECENTE DA ANDRESSA:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads, -- DEVERIA SER 1, NÃO 0
    filter,
    cadence,
    workflow_id,
    execution_id,
    created_at,
    updated_at,
    (n8n_data->>'initial_leads_requested') as leads_solicitados,
    (n8n_data->>'status') as n8n_status,
    n8n_data
FROM public.reactivated_leads 
WHERE sdr = 'Andressa Habinoski'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Corrigir manualmente o registro mais recente da Andressa
-- Se count_leads está 0 mas deveria ser 1
UPDATE public.reactivated_leads 
SET 
    count_leads = 1, -- Corrigir para 1 lead solicitado
    n8n_data = COALESCE(n8n_data, '{}'::jsonb) || jsonb_build_object(
        'initial_leads_requested', 1,
        'status', 'started',
        'started_at', created_at::text,
        'correction_applied', NOW()::text,
        'correction_reason', 'production_test_1_lead'
    ),
    updated_at = NOW()
WHERE sdr = 'Andressa Habinoski'
  AND id = (
      SELECT id FROM public.reactivated_leads 
      WHERE sdr = 'Andressa Habinoski'
      ORDER BY created_at DESC 
      LIMIT 1
  )
  AND count_leads = 0; -- Só se estiver 0

-- 3. Verificar se foi corrigido
SELECT 'APÓS CORREÇÃO:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads, -- DEVE MOSTRAR 1
    (n8n_data->>'initial_leads_requested') as leads_solicitados,
    (n8n_data->>'correction_applied') as foi_corrigido,
    created_at,
    updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Andressa Habinoski'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Verificar quantos registros updated hoje
SELECT 'REGISTROS ATUALIZADOS HOJE:' as info;
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN count_leads > 0 THEN 1 END) as com_leads_corretos,
    COUNT(CASE WHEN count_leads = 0 THEN 1 END) as com_zero_leads
FROM public.reactivated_leads 
WHERE created_at::date = CURRENT_DATE;
