-- 🔍 DEBUG: Verificar status da ligação da Hiara
-- Script para diagnosticar o problema

-- 1. Verificar se a ligação existe
SELECT 'Ligação da Hiara encontrada:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.status_voip_friendly,
    c.call_type,
    c.duration,
    c.created_at
FROM calls c
WHERE c.id = '495aca80-b525-41e6-836e-0e9208e6c73a'
   OR c.provider_call_id LIKE '%495aca80%'
   OR c.agent_id LIKE '%Hiara%'
   OR c.agent_id LIKE '%hiara%'
ORDER BY c.created_at DESC;

-- 2. Verificar se a coluna status_voip_friendly existe
SELECT 'Verificando coluna status_voip_friendly:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
AND column_name = 'status_voip_friendly';

-- 3. Verificar todas as colunas da tabela calls
SELECT 'Todas as colunas da tabela calls:' as info;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar se há ligações com status_voip = 'normal_clearing'
SELECT 'Ligações com status_voip = normal_clearing:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.status_voip_friendly,
    c.agent_id,
    c.call_type,
    c.duration
FROM calls c
WHERE c.status_voip = 'normal_clearing'
ORDER BY c.created_at DESC
LIMIT 5;
