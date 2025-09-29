-- 🔍 Debug: Por que reativação da Hiara fica Pendente
-- Investigar o fluxo completo da reativação

-- 1. Verificar registros mais recentes da Hiara
SELECT 
    id,
    sdr,
    filter,
    status,
    count_leads,
    cadence,
    workflow_id,
    execution_id,
    created_at,
    updated_at,
    n8n_data,
    error_message
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar se há dados do N8N
SELECT 
    id,
    sdr,
    status,
    n8n_data,
    workflow_id,
    execution_id,
    (n8n_data IS NOT NULL) as has_n8n_data,
    (n8n_data->>'status') as n8n_status,
    (n8n_data->>'message') as n8n_message,
    created_at
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Verificar padrão de outros SDRs para comparação
SELECT 
    sdr,
    status,
    count(*)::int as total_registros,
    count(CASE WHEN status = 'pending' THEN 1 END)::int as pendentes,
    count(CASE WHEN status = 'completed' THEN 1 END)::int as concluidos,
    max(created_at) as ultimo_registro
FROM public.reactivated_leads 
GROUP BY sdr, status
ORDER BY ultimo_registro DESC;

-- 4. Verificar se existe função de callback do N8N
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name ILIKE '%callback%' 
   OR routine_name ILIKE '%n8n%'
   OR routine_name ILIKE '%reactivat%'
ORDER BY routine_name;

-- 5. Verificar logs de erro se houver
SELECT 
    id,
    sdr,
    error_message,
    created_at
FROM public.reactivated_leads 
WHERE error_message IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Verificar estrutura completa do último registro da Hiara
SELECT 
    'Último registro da Hiara:' as info,
    *
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC 
LIMIT 1;
