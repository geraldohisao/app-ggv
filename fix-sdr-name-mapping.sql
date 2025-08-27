-- Script para mapear SDRs UUIDs com nomes reais da tabela profiles
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela profiles existe e tem dados
SELECT 
    COUNT(*) as total_profiles,
    COUNT(full_name) as profiles_with_names
FROM public.profiles;

-- 2. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar SDRs únicos nas chamadas
SELECT 
    sdr_id,
    COUNT(*) as call_count
FROM public.calls 
WHERE sdr_id IS NOT NULL
GROUP BY sdr_id
ORDER BY call_count DESC;

-- 4. Verificar se os SDRs das chamadas existem na tabela profiles
SELECT 
    c.sdr_id,
    p.full_name,
    p.email,
    COUNT(c.id) as call_count,
    CASE 
        WHEN p.id IS NOT NULL THEN 'ENCONTRADO'
        ELSE 'NÃO ENCONTRADO'
    END as status
FROM (
    SELECT DISTINCT sdr_id
    FROM public.calls 
    WHERE sdr_id IS NOT NULL
) c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
ORDER BY call_count DESC;

-- 5. Atualizar a tabela user_mapping com nomes reais dos SDRs
UPDATE public.user_mapping 
SET full_name = p.full_name,
    email = p.email
FROM public.profiles p
WHERE user_mapping.agent_id = p.id::TEXT
AND user_mapping.role = 'sdr'
AND p.full_name IS NOT NULL;

-- 6. Verificar resultado da atualização
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
WHERE role = 'sdr'
ORDER BY full_name;

-- 7. Criar função para sincronização automática de nomes
CREATE OR REPLACE FUNCTION sync_sdr_names_from_profiles()
RETURNS void AS $$
BEGIN
    -- Atualizar nomes dos SDRs com dados da tabela profiles
    UPDATE public.user_mapping 
    SET full_name = p.full_name,
        email = p.email
    FROM public.profiles p
    WHERE user_mapping.agent_id = p.id::TEXT
    AND user_mapping.role = 'sdr'
    AND p.full_name IS NOT NULL;
    
    -- Log das atualizações
    RAISE NOTICE 'SDR names synchronized from profiles table';
END;
$$ LANGUAGE plpgsql;

-- 8. Executar a função de sincronização
SELECT sync_sdr_names_from_profiles();

-- 9. Verificar resultado final
SELECT 
    agent_id,
    full_name,
    role,
    email,
    created_at
FROM public.user_mapping 
ORDER BY full_name;

-- 10. Verificar estatísticas finais
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE 'SDR %' AND full_name NOT LIKE 'Usuário %' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE 'SDR %' OR full_name LIKE 'Usuário %' THEN 1 END) as unnamed_users
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 11. Verificar SDRs que ainda não têm nome mapeado
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    COUNT(c.id) as total_calls
FROM public.user_mapping um
LEFT JOIN public.calls c ON um.agent_id = c.sdr_id::TEXT
WHERE um.role = 'sdr'
AND um.full_name LIKE 'SDR %'
GROUP BY um.agent_id, um.full_name, um.role
ORDER BY total_calls DESC;
