-- Script simples para mapear SDRs com nomes reais
-- Execute este script no Supabase SQL Editor

-- 1. Limpar a tabela user_mapping atual
TRUNCATE TABLE public.user_mapping;

-- 2. Inserir agent_id (usuários com nomes)
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    agent_id,
    'Usuário ' || agent_id as full_name,
    'user' as role
FROM public.calls 
WHERE agent_id IS NOT NULL;

-- 3. Inserir sdr_id com nomes reais da tabela profiles
INSERT INTO public.user_mapping (agent_id, full_name, role, email)
SELECT DISTINCT 
    c.sdr_id::TEXT,
    COALESCE(p.full_name, 'SDR ' || c.sdr_id::TEXT) as full_name,
    'sdr' as role,
    p.email
FROM public.calls c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
WHERE c.sdr_id IS NOT NULL;

-- 4. Verificar resultado
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 5. Verificar estatísticas
SELECT 
    role,
    COUNT(*) as total,
    COUNT(CASE WHEN full_name NOT LIKE 'SDR %' AND full_name NOT LIKE 'Usuário %' THEN 1 END) as named_users
FROM public.user_mapping 
GROUP BY role;
