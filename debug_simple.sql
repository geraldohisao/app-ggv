-- Debug SUPER SIMPLES: Verificar tabela reactivated_leads

-- 1. Ver que colunas existem na tabela
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Contar registros
SELECT COUNT(*) as total_records
FROM public.reactivated_leads;

-- 3. Mostrar dados (se existirem)
SELECT *
FROM public.reactivated_leads
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar se as funções existem
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%reactivated%';

-- 5. Verificar RLS básico
SELECT tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'reactivated_leads';
