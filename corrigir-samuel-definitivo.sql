-- Script DEFINITIVO para corrigir Samuel Bueno
-- Execute no SQL Editor do Supabase

-- 1. BUSCAR Samuel Bueno por todas as variações possíveis
SELECT 
    '=== BUSCA SAMUEL BUENO ===' as info,
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'full_name' as metadata_name
FROM auth.users u 
WHERE LOWER(u.email) LIKE '%samuel%' 
   OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%samuel%'
ORDER BY u.created_at DESC;

-- 2. VERIFICAR profile atual
SELECT 
    '=== PROFILE ATUAL ===' as info,
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.role = 'ADMIN' AND p.user_function = 'Gestor' THEN '✅ CONFIGURADO CORRETAMENTE'
        WHEN p.role = 'ADMIN' THEN '⚠️ ROLE OK, FUNÇÃO INCORRETA'
        ELSE '❌ PRECISA CORREÇÃO'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) LIKE '%samuel%';

-- 3. FORÇAR CORREÇÃO COMPLETA
-- Atualizar TODOS os usuários que podem ser Samuel Bueno
UPDATE public.profiles 
SET 
    role = 'ADMIN',
    user_function = 'Gestor',
    name = CASE 
        WHEN name IS NULL OR name = '' THEN 'Samuel Bueno'
        ELSE name 
    END,
    email = COALESCE(email, (SELECT email FROM auth.users WHERE id = profiles.id))
WHERE id IN (
    SELECT u.id 
    FROM auth.users u 
    WHERE LOWER(u.email) LIKE '%samuel%'
       OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%samuel%'
);

-- 4. Se não existe profile, criar um
INSERT INTO public.profiles (id, role, user_function, email, name)
SELECT 
    u.id,
    'ADMIN' as role,
    'Gestor' as user_function,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        'Samuel Bueno'
    ) as name
FROM auth.users u
WHERE (LOWER(u.email) LIKE '%samuel%' OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%samuel%')
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 5. VERIFICAÇÃO FINAL COMPLETA
SELECT 
    '=== RESULTADO FINAL ===' as info,
    u.email as user_email,
    p.role,
    p.user_function,
    p.name,
    p.email as profile_email,
    CASE 
        WHEN p.role = 'ADMIN' AND p.user_function = 'Gestor' THEN '✅ PERFEITO - TEM ACESSO COMPLETO'
        WHEN p.role = 'ADMIN' AND p.user_function IS NULL THEN '⚠️ ROLE OK, MAS SEM FUNÇÃO (visão SDR)'
        WHEN p.role = 'ADMIN' AND p.user_function = 'SDR' THEN '⚠️ ROLE OK, MAS FUNÇÃO SDR (visão limitada)'
        WHEN p.role = 'ADMIN' THEN '⚠️ ROLE OK, FUNÇÃO: ' || COALESCE(p.user_function, 'NULL')
        ELSE '❌ SEM ACESSO - ROLE: ' || COALESCE(p.role, 'NULL')
    END as status_final,
    CASE 
        WHEN p.role IN ('ADMIN', 'SUPER_ADMIN') THEN '✅ PODE ACESSAR REATIVAÇÃO'
        ELSE '❌ SEM ACESSO À REATIVAÇÃO'
    END as reativacao_access,
    CASE 
        WHEN p.user_function = 'Gestor' THEN '✅ VISÃO DE GESTOR'
        WHEN p.user_function = 'Closer' THEN '✅ VISÃO DE CLOSER' 
        WHEN p.user_function = 'SDR' THEN '⚠️ VISÃO DE SDR (limitada)'
        ELSE '⚠️ SEM FUNÇÃO (visão SDR por padrão)'
    END as interface_view
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) LIKE '%samuel%'
   OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%samuel%';

-- 6. TESTE: Simular consulta que o sistema faz
SELECT 
    '=== SIMULAÇÃO SISTEMA ===' as info,
    p.role,
    p.user_function,
    'DirectUserContext carregará estes valores' as observacao
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE LOWER(u.email) LIKE '%samuel%';
