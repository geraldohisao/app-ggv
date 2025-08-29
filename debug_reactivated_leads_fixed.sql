-- Debug CORRIGIDO: Verificar dados na tabela reactivated_leads

-- 1. Primeiro, vamos ver que colunas existem na tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se a tabela existe e tem dados
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM public.reactivated_leads;

-- 3. Mostrar todos os registros (adaptado às colunas existentes)
SELECT 
    id,
    created_at,
    sdr,
    filter,
    status,
    count_leads
FROM public.reactivated_leads
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se as funções RPC existem
SELECT 
    routine_name,
    routine_type
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
    cmd
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
