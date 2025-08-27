-- Script para verificar e corrigir a tabela profiles
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela profiles existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as table_exists;

-- 2. Verificar estrutura da tabela profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar se há dados na tabela profiles
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 4. Verificar primeiros registros
SELECT id, full_name, email, role, created_at
FROM public.profiles 
LIMIT 5;

-- 5. Verificar RLS (Row Level Security) na tabela profiles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 6. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 7. Se a tabela não existir, criar uma básica
-- (Descomente se necessário)
/*
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política básica para permitir leitura
CREATE POLICY "Allow public read access" ON public.profiles
    FOR SELECT USING (true);

-- Política para permitir inserção/atualização do próprio usuário
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);
*/

-- 8. Verificar usuários na tabela calls
SELECT 
    COUNT(DISTINCT sdr_id) as unique_sdrs,
    COUNT(DISTINCT agent_id) as unique_agents
FROM public.calls 
WHERE sdr_id IS NOT NULL OR agent_id IS NOT NULL;

-- 9. Listar SDRs únicos das chamadas
SELECT DISTINCT 
    sdr_id,
    sdr_name,
    COUNT(*) as total_calls
FROM public.calls 
WHERE sdr_id IS NOT NULL
GROUP BY sdr_id, sdr_name
ORDER BY total_calls DESC
LIMIT 10;

-- 10. Verificar se há inconsistências entre profiles e calls
SELECT 
    c.sdr_id,
    c.sdr_name,
    p.full_name as profile_name,
    CASE 
        WHEN p.id IS NULL THEN 'SDR não está em profiles'
        ELSE 'SDR encontrado em profiles'
    END as status
FROM (
    SELECT DISTINCT sdr_id, sdr_name 
    FROM public.calls 
    WHERE sdr_id IS NOT NULL
) c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
ORDER BY c.sdr_name;
