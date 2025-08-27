-- Script para verificar a relação entre calls e profiles
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela calls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calls'
AND column_name IN ('agent_id', 'sdr_id', 'sdr_name')
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('id', 'full_name', 'email', 'role')
ORDER BY ordinal_position;

-- 3. Verificar tipos de dados das colunas de ID
SELECT 
    'calls.agent_id' as column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calls'
AND column_name = 'agent_id'

UNION ALL

SELECT 
    'profiles.id' as column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'id';

-- 4. Verificar se há dados nas tabelas
SELECT 
    'calls' as table_name,
    COUNT(*) as total_records,
    COUNT(agent_id) as records_with_agent_id,
    COUNT(sdr_id) as records_with_sdr_id,
    COUNT(sdr_name) as records_with_sdr_name
FROM public.calls

UNION ALL

SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(id) as records_with_id,
    COUNT(full_name) as records_with_full_name,
    COUNT(role) as records_with_role
FROM public.profiles;

-- 5. Verificar valores únicos de agent_id
SELECT 
    agent_id,
    COUNT(*) as call_count,
    MIN(sdr_name) as sample_sdr_name
FROM public.calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY call_count DESC
LIMIT 10;

-- 6. Verificar se agent_id corresponde a profiles.id
SELECT 
    c.agent_id,
    c.sdr_name as call_sdr_name,
    p.full_name as profile_full_name,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NOT NULL THEN 'MATCH'
        ELSE 'NO MATCH'
    END as status
FROM (
    SELECT DISTINCT agent_id, sdr_name
    FROM public.calls 
    WHERE agent_id IS NOT NULL
    LIMIT 10
) c
LEFT JOIN public.profiles p ON c.agent_id = p.id
ORDER BY c.sdr_name;

-- 7. Testar query de join simples
SELECT 
    c.agent_id,
    c.sdr_name,
    p.full_name,
    p.role
FROM public.calls c
LEFT JOIN public.profiles p ON c.agent_id = p.id
WHERE c.agent_id IS NOT NULL
LIMIT 5;

-- 8. Verificar se há problemas de tipo de dados
SELECT 
    agent_id,
    pg_typeof(agent_id) as agent_id_type,
    sdr_id,
    pg_typeof(sdr_id) as sdr_id_type
FROM public.calls 
WHERE agent_id IS NOT NULL
LIMIT 3;
