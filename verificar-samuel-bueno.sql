-- Script rápido para verificar Samuel Bueno
-- Execute no SQL Editor do Supabase

-- 1. Buscar todos os possíveis emails do Samuel Bueno
SELECT 
    '=== BUSCA POR SAMUEL BUENO ===' as info,
    u.email,
    u.id,
    u.created_at as user_created,
    u.raw_user_meta_data->>'full_name' as full_name
FROM auth.users u 
WHERE u.email ILIKE '%samuel%' 
   OR u.raw_user_meta_data->>'full_name' ILIKE '%samuel%'
ORDER BY u.created_at DESC;

-- 2. Verificar perfil na tabela profiles
SELECT 
    '=== PERFIL ATUAL ===' as info,
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.role IN ('ADMIN', 'SUPER_ADMIN') THEN '✅ TEM ACESSO'
        ELSE '❌ SEM ACESSO'
    END as access_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email ILIKE '%samuel%';

-- 3. FORÇAR CORREÇÃO se necessário
-- Descomente as linhas abaixo se o Samuel não estiver com ADMIN

-- UPDATE public.profiles 
-- SET 
--     role = 'ADMIN',
--     user_function = 'Gestor',
--     name = 'Samuel Bueno'
-- WHERE id IN (
--     SELECT u.id FROM auth.users u 
--     WHERE u.email ILIKE '%samuel%'
-- );

-- 4. Verificação final
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as info,
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.role = 'ADMIN' AND p.user_function = 'Gestor' THEN '✅ CONFIGURADO CORRETAMENTE'
        WHEN p.role = 'ADMIN' THEN '⚠️ ROLE OK, MAS FUNÇÃO PODE ESTAR ERRADA'
        ELSE '❌ PRECISA CORREÇÃO'
    END as final_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email ILIKE '%samuel%';
