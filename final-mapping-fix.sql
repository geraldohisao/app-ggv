-- Script final para corrigir problemas específicos de mapeamento
-- Execute este script no Supabase SQL Editor

-- 1. Verificar SDRs que ainda não têm nome mapeado
SELECT 'SDRs SEM NOME REAL' as status;
SELECT 
    um.agent_id,
    um.full_name,
    um.role
FROM public.user_mapping um
WHERE um.full_name LIKE 'SDR %'
ORDER BY um.full_name;

-- 2. Verificar se esses SDRs existem na tabela profiles
SELECT 'VERIFICANDO PROFILES PARA SDRs' as status;
SELECT 
    um.agent_id as sdr_id,
    um.full_name as current_name,
    p.full_name as profile_name,
    p.email as profile_email,
    CASE 
        WHEN p.id IS NOT NULL THEN 'ENCONTRADO'
        ELSE 'NÃO ENCONTRADO'
    END as status
FROM public.user_mapping um
LEFT JOIN public.profiles p ON um.agent_id = p.id::TEXT
WHERE um.full_name LIKE 'SDR %'
ORDER BY um.full_name;

-- 3. Atualizar nomes dos SDRs que existem na tabela profiles
UPDATE public.user_mapping 
SET full_name = p.full_name,
    email = p.email
FROM public.profiles p
WHERE user_mapping.agent_id = p.id::TEXT
AND user_mapping.full_name LIKE 'SDR %'
AND p.full_name IS NOT NULL;

-- 4. Remover duplicatas (manter apenas o nome real)
DELETE FROM public.user_mapping 
WHERE full_name = 'Usuário 1001-Camila Ataliba'
AND agent_id = '1001-Camila Ataliba';

-- 5. Verificar resultado final
SELECT 'RESULTADO FINAL' as status;
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 6. Verificar estatísticas finais
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE 'SDR %' AND full_name NOT LIKE 'Usuário %' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE 'SDR %' OR full_name LIKE 'Usuário %' THEN 1 END) as unnamed_users
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 7. Verificar se ainda há problemas
SELECT 'PROBLEMAS RESTANTES' as status;
SELECT 
    agent_id,
    full_name,
    role,
    CASE 
        WHEN full_name LIKE 'SDR %' THEN 'SDR ainda sem nome real'
        WHEN full_name LIKE 'Usuário %' THEN 'Usuário ainda sem nome real'
        ELSE 'Nome mapeado corretamente'
    END as status
FROM public.user_mapping um
WHERE full_name LIKE 'SDR %' OR full_name LIKE 'Usuário %'
ORDER BY full_name;
