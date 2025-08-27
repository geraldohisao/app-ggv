-- Script completo para resolver todos os problemas de mapeamento
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'ANTES DA CORREÇÃO' as status;
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 2. Limpar completamente a tabela
TRUNCATE TABLE public.user_mapping;

-- 3. Verificar se a tabela profiles tem dados
SELECT 'VERIFICANDO PROFILES' as status;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(full_name) as profiles_with_names
FROM public.profiles;

-- 4. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('id', 'full_name', 'email', 'role')
ORDER BY ordinal_position;

-- 5. Inserir agent_id (usuários que fizeram ligações)
-- Usar nomes reais se existirem na tabela profiles
INSERT INTO public.user_mapping (agent_id, full_name, role, email)
SELECT DISTINCT 
    c.agent_id,
    COALESCE(p.full_name, 'Usuário ' || c.agent_id) as full_name,
    COALESCE(p.role, 'user') as role,
    p.email
FROM public.calls c
LEFT JOIN public.profiles p ON c.agent_id = p.id::TEXT
WHERE c.agent_id IS NOT NULL;

-- 6. Inserir sdr_id com nomes reais da tabela profiles
INSERT INTO public.user_mapping (agent_id, full_name, role, email)
SELECT DISTINCT 
    c.sdr_id::TEXT,
    COALESCE(p.full_name, 'SDR ' || c.sdr_id::TEXT) as full_name,
    COALESCE(p.role, 'sdr') as role,
    p.email
FROM public.calls c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
WHERE c.sdr_id IS NOT NULL
AND c.sdr_id::TEXT NOT IN (SELECT agent_id FROM public.user_mapping);

-- 7. Remover duplicatas baseadas no nome (manter o primeiro)
DELETE FROM public.user_mapping 
WHERE id NOT IN (
    SELECT MIN(id)
    FROM public.user_mapping
    GROUP BY full_name
);

-- 8. Verificar resultado final
SELECT 'APÓS A CORREÇÃO' as status;
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 9. Verificar estatísticas finais
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE 'SDR %' AND full_name NOT LIKE 'Usuário %' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE 'SDR %' OR full_name LIKE 'Usuário %' THEN 1 END) as unnamed_users
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 10. Verificar usuários com mais ligações
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    COUNT(c.id) as total_calls
FROM public.user_mapping um
LEFT JOIN public.calls c ON um.agent_id = c.agent_id OR um.agent_id = c.sdr_id::TEXT
GROUP BY um.agent_id, um.full_name, um.role
ORDER BY total_calls DESC
LIMIT 15;

-- 11. Verificar se há problemas de mapeamento
SELECT 'PROBLEMAS DE MAPEAMENTO' as status;
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    CASE 
        WHEN um.full_name LIKE 'SDR %' THEN 'SDR sem nome real'
        WHEN um.full_name LIKE 'Usuário %' THEN 'Usuário sem nome real'
        ELSE 'Nome mapeado corretamente'
    END as status
FROM public.user_mapping um
ORDER BY um.full_name;
