-- Script para debugar status de admin do Samuel
-- Execute no SQL Editor do Supabase LOGADO COMO SAMUEL

-- 1. VERIFICAR informações da sessão atual
SELECT 
    '=== INFORMAÇÕES DA SESSÃO ATUAL ===' as info,
    auth.uid() as current_user_id,
    current_user as database_user,
    session_user as session_user,
    current_setting('request.jwt.claims', true)::jsonb as jwt_claims;

-- 2. VERIFICAR perfil do usuário atual
SELECT 
    '=== PERFIL DO USUÁRIO ATUAL ===' as info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at,
    CASE 
        WHEN p.role = 'ADMIN' OR p.role = 'SUPER_ADMIN' THEN '✅ É ADMIN'
        ELSE '❌ NÃO É ADMIN'
    END as admin_status
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. TESTAR função is_admin() diretamente
SELECT 
    '=== TESTE FUNÇÃO IS_ADMIN ===' as info,
    public.is_admin() as is_admin_result;

-- 4. VERIFICAR se Samuel existe na tabela auth.users
SELECT 
    '=== VERIFICAÇÃO AUTH.USERS ===' as info,
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'full_name' as metadata_name
FROM auth.users u
WHERE u.id = auth.uid();

-- 5. VERIFICAR se Samuel existe na tabela profiles
SELECT 
    '=== VERIFICAÇÃO PROFILES ===' as info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
FROM public.profiles p
WHERE p.id = auth.uid();

-- 6. TESTAR query da função admin_list_profiles_simple manualmente
SELECT 
    '=== TESTE MANUAL DA QUERY ===' as info,
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('SUPER_ADMIN','ADMIN')
    ) as is_admin_manual_check;

-- 7. LISTAR todos os perfis (se for admin)
SELECT 
    '=== TODOS OS PERFIS (se admin) ===' as info,
    COUNT(*) as total_profiles
FROM public.profiles;

-- 8. VERIFICAR políticas RLS
SELECT 
    '=== POLÍTICAS RLS PROFILES ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
