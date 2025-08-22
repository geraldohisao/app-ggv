-- Script para verificar e corrigir acesso do usuário Samuel Bueno
-- Execute no SQL Editor do Supabase

-- 1. Primeiro, vamos consultar o status atual do usuário Samuel Bueno
-- Testando possíveis variações do email
SELECT 
    u.email,
    u.created_at as user_created,
    p.id,
    p.role,
    p.user_function,
    p.name,
    p.email as profile_email,
    p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br');

-- 2. Se o usuário existe mas não tem perfil, criar:
INSERT INTO public.profiles (id, role, user_function, email, name)
SELECT 
    u.id,
    'ADMIN' as role,
    'Gestor' as user_function,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name', 
        'Samuel Bueno'
    ) as name
FROM auth.users u
WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br')
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 3. Se o perfil existe mas tem role/function incorretos, atualizar:
UPDATE public.profiles 
SET 
    role = 'ADMIN',
    user_function = 'Gestor',
    name = COALESCE(name, 'Samuel Bueno'),
    email = COALESCE(email, (SELECT email FROM auth.users WHERE id = profiles.id))
FROM auth.users u
WHERE profiles.id = u.id 
AND u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br')
AND (profiles.role != 'ADMIN' OR profiles.user_function != 'Gestor' OR profiles.user_function IS NULL);

-- 4. Verificar o resultado final
SELECT 
    u.email as user_email,
    p.role,
    p.user_function,
    p.name,
    p.email as profile_email,
    CASE 
        WHEN p.role IN ('ADMIN', 'SUPER_ADMIN') THEN 'TEM ACESSO à Reativação de Leads'
        ELSE 'NÃO TEM ACESSO à Reativação de Leads'
    END as access_status,
    CASE 
        WHEN p.user_function = 'SDR' THEN '⚠️ FUNÇÃO SDR (pode causar visão limitada)'
        WHEN p.user_function = 'Gestor' THEN '✅ FUNÇÃO GESTOR'
        WHEN p.user_function = 'Closer' THEN '✅ FUNÇÃO CLOSER'
        ELSE '❓ FUNÇÃO NÃO DEFINIDA'
    END as function_status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br');

-- 5. Verificar todos os usuários com role ADMIN para comparação
SELECT 
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.role IN ('ADMIN', 'SUPER_ADMIN') THEN '✅ TEM ACESSO'
        ELSE '❌ SEM ACESSO'
    END as reativacao_access,
    CASE 
        WHEN p.user_function = 'SDR' THEN '⚠️ SDR'
        WHEN p.user_function = 'Gestor' THEN '✅ GESTOR'
        WHEN p.user_function = 'Closer' THEN '✅ CLOSER'
        ELSE '❓ SEM FUNÇÃO'
    END as function_view
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.role IN ('ADMIN', 'SUPER_ADMIN')
ORDER BY u.email;

-- 6. DIAGNÓSTICO: Verificar se existe alguma tabela user_functions separada
SELECT 
    uf.user_id,
    uf.function as separate_function,
    u.email,
    p.user_function as profile_function
FROM public.user_functions uf
JOIN auth.users u ON uf.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br');

-- 7. LIMPEZA: Remover entradas conflitantes na tabela user_functions se existir
DELETE FROM public.user_functions 
WHERE user_id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br')
);

-- 8. VERIFICAÇÃO FINAL COMPLETA
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.role IN ('ADMIN', 'SUPER_ADMIN') THEN '✅ PODE ACESSAR REATIVAÇÃO'
        ELSE '❌ SEM ACESSO'
    END as final_access_status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('samuel.bueno@grupoggv.com', 'samuel@grupoggv.com', 'samuel.bueno@ggvinteligencia.com.br');
