-- Script para debugar acesso do Samuel como admin
-- Execute no SQL Editor do Supabase

-- 1. VERIFICAR se Samuel é realmente admin
SELECT 
    '=== VERIFICAÇÃO SAMUEL ADMIN ===' as info,
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'full_name' as metadata_name,
    p.role,
    p.user_function,
    p.name as profile_name,
    CASE 
        WHEN p.role = 'ADMIN' OR p.role = 'SUPER_ADMIN' THEN '✅ É ADMIN'
        ELSE '❌ NÃO É ADMIN'
    END as admin_status
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) LIKE '%samuel%' 
   OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%samuel%'
   OR LOWER(p.name) LIKE '%samuel%'
ORDER BY u.created_at DESC;

-- 2. TESTAR função is_admin() para Samuel
-- (Execute como Samuel logado)
SELECT 
    '=== TESTE IS_ADMIN ===' as info,
    public.is_admin() as is_admin_result,
    auth.uid() as current_user_id,
    current_user as db_user;

-- 3. TESTAR RPC admin_list_profiles diretamente
-- (Execute como Samuel logado)
SELECT 
    '=== TESTE RPC ADMIN_LIST_PROFILES ===' as info,
    COUNT(*) as total_profiles_returned
FROM public.admin_list_profiles();

-- 4. TESTAR query direta na tabela profiles
-- (Execute como Samuel logado)
SELECT 
    '=== TESTE QUERY DIRETA ===' as info,
    COUNT(*) as total_profiles_direct,
    string_agg(name, ', ') as profile_names
FROM public.profiles;

-- 5. VERIFICAR todas as políticas RLS na tabela profiles
SELECT 
    '=== POLÍTICAS RLS PROFILES ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
   OR schemaname = 'public';

-- 6. LISTAR todos os perfis para comparação
SELECT 
    '=== TODOS OS PERFIS DISPONÍVEIS ===' as info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;

-- 7. VERIFICAR se há problemas de permissão específicos
SELECT 
    '=== VERIFICAÇÃO PERMISSÕES ===' as info,
    has_table_privilege(auth.uid(), 'public.profiles', 'SELECT') as can_select_profiles,
    has_table_privilege(auth.uid(), 'public.profiles', 'INSERT') as can_insert_profiles,
    has_table_privilege(auth.uid(), 'public.profiles', 'UPDATE') as can_update_profiles;
