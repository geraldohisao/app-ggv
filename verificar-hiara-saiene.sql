-- Script para verificar e adicionar Hiara Saiene na tabela profiles
-- Execute no SQL Editor do Supabase

-- 1. VERIFICAR se Hiara Saiene já existe
SELECT 
    '=== VERIFICAÇÃO HIARA SAIENE ===' as info,
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'full_name' as metadata_name,
    p.role,
    p.user_function,
    p.name as profile_name
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) LIKE '%hiara%' 
   OR LOWER(u.raw_user_meta_data->>'full_name') LIKE '%hiara%'
   OR LOWER(p.name) LIKE '%hiara%'
ORDER BY u.created_at DESC;

-- 2. LISTAR todos os perfis atuais para referência
SELECT 
    '=== TODOS OS PERFIS ATUAIS ===' as info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
FROM public.profiles p
ORDER BY p.name;

-- 3. SE HIARA NÃO EXISTE, CRIAR UM PERFIL DE EXEMPLO
-- (Descomente e ajuste o email se necessário)
/*
INSERT INTO public.profiles (id, role, user_function, email, name)
VALUES (
    gen_random_uuid(), -- ID temporário para teste
    'USER' as role,
    'SDR' as user_function,
    'hiara@grupoggv.com' as email, -- Ajuste conforme necessário
    'Hiara Saiene' as name
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    user_function = EXCLUDED.user_function;
*/

-- 4. VERIFICAÇÃO FINAL
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN name LIKE '%Hiara%' THEN 1 END) as hiara_profiles
FROM public.profiles;
