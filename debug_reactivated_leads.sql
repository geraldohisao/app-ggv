-- Debug: Verificar dados na tabela reactivated_leads

-- 1. Verificar se a tabela existe e tem dados
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM public.reactivated_leads;

-- 2. Mostrar todos os registros (limitado a 10)
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
    updated_at
FROM public.reactivated_leads
ORDER BY created_at DESC
LIMIT 10;

-- 3. Testar a função RPC
SELECT * FROM public.get_reactivated_leads_history(1, 10, NULL, NULL);

-- 4. Verificar se as funções existem
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%reactivated_leads%';

-- 5. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'reactivated_leads';

-- 6. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'reactivated_leads';
