-- Script para verificar a estrutura real da tabela calls
-- Execute este script no Supabase SQL Editor

-- 1. Verificar todas as colunas da tabela calls
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calls'
ORDER BY ordinal_position;

-- 2. Verificar se existem colunas relacionadas a usuários
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calls'
AND (
    column_name LIKE '%sdr%' OR 
    column_name LIKE '%agent%' OR 
    column_name LIKE '%user%' OR
    column_name LIKE '%name%'
)
ORDER BY column_name;

-- 3. Verificar dados de exemplo da tabela calls
SELECT * FROM public.calls LIMIT 3;

-- 4. Verificar se há colunas com nomes de usuários
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calls'
AND column_name IN ('agent_id', 'sdr_id', 'sdr_name', 'agent_name', 'user_id', 'user_name')
ORDER BY column_name;
