-- 🔧 Correção RÁPIDA: Registro pendente atual da Andressa
-- Problema: Novo registro criado com 0 leads, deveria ser 1 lead

-- 1. Encontrar o registro pendente mais recente da Andressa
SELECT 'REGISTRO PENDENTE ATUAL:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads, -- ESTÁ 0, DEVERIA SER 1
    filter,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE sdr = 'Andressa Habinoski'
  AND status = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Corrigir imediatamente para 1 lead
UPDATE public.reactivated_leads 
SET 
    count_leads = 1, -- CORRIGIR: 1 lead solicitado
    n8n_data = COALESCE(n8n_data, '{}'::jsonb) || jsonb_build_object(
        'initial_leads_requested', 1,
        'status', 'started',
        'started_at', created_at::text,
        'correction_applied', NOW()::text,
        'correction_reason', 'user_requested_1_lead_showing_0'
    ),
    updated_at = NOW()
WHERE sdr = 'Andressa Habinoski'
  AND status = 'pending'
  AND count_leads = 0 -- Só se estiver 0
  AND created_at > NOW() - INTERVAL '30 minutes'; -- Últimos 30 min

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

-- 4. Mostrar quantos registros foram atualizados
SELECT 
    CASE 
        WHEN ROW_COUNT > 0 THEN '✅ Registro corrigido com sucesso!'
        ELSE '⚠️ Nenhum registro foi atualizado'
    END as resultado;
