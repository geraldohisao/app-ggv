-- ============================================
-- FIX: Corrigir perfil da Camila para Closer
-- ============================================
-- Problema: Camila não consegue ver visão de closer no OTE
-- Solução: Atualizar user_function para 'Closer' na tabela profiles

-- 1️⃣ VERIFICAR SITUAÇÃO ATUAL DA CAMILA
SELECT '========== SITUAÇÃO ATUAL DA CAMILA ==========' as step;

SELECT 
    u.id,
    u.email,
    p.role,
    p.user_function,
    p.name,
    p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email ILIKE '%camila.ataliba%'
ORDER BY u.email;

-- 2️⃣ VERIFICAR TODOS OS EMAILS RELACIONADOS À CAMILA
SELECT '========== TODOS OS EMAILS DA CAMILA ==========' as step;

SELECT DISTINCT email
FROM auth.users
WHERE email ILIKE '%camila%'
ORDER BY email;

-- 3️⃣ ATUALIZAR FUNÇÃO PARA 'Closer'
SELECT '========== ATUALIZANDO FUNÇÃO PARA CLOSER ==========' as step;

-- Atualizar para camila.ataliba@grupoggv.com
UPDATE public.profiles
SET user_function = 'Closer'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'camila.ataliba@grupoggv.com'
)
RETURNING id, email, name, role, user_function;

-- Atualizar para outros emails da Camila se existirem
UPDATE public.profiles
SET user_function = 'Closer'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%camila.ataliba%'
    AND email != 'camila.ataliba@grupoggv.com'
)
RETURNING id, email, name, role, user_function;

-- 4️⃣ VERIFICAR SE O PROFILE EXISTE
SELECT '========== VERIFICANDO SE PROFILE EXISTE ==========' as step;

-- Se não existir profile, criar um
INSERT INTO public.profiles (id, role, user_function, email, name)
SELECT 
    u.id,
    'USER' as role,
    'Closer' as user_function,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        'Camila Ataliba'
    ) as name
FROM auth.users u
WHERE u.email = 'camila.ataliba@grupoggv.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE
SET 
    user_function = 'Closer',
    email = EXCLUDED.email,
    name = EXCLUDED.name
RETURNING id, email, name, role, user_function;

-- 5️⃣ VERIFICAÇÃO FINAL
SELECT '========== VERIFICAÇÃO FINAL ==========' as step;

SELECT 
    u.id,
    u.email,
    p.role,
    p.user_function,
    p.name,
    CASE 
        WHEN p.user_function = 'Closer' THEN '✅ CORRETO'
        WHEN p.user_function IS NULL THEN '❌ SEM FUNÇÃO'
        ELSE '⚠️ FUNÇÃO INCORRETA: ' || p.user_function
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email ILIKE '%camila.ataliba%'
ORDER BY u.email;

-- 6️⃣ VERIFICAR PERMISSÕES DE ACESSO AO OTE
SELECT '========== VERIFICAR ACESSO AO OTE ==========' as step;

SELECT 
    email,
    role,
    user_function,
    CASE 
        WHEN role IN ('SUPER_ADMIN', 'ADMIN') THEN '✅ ACESSO TOTAL (Admin)'
        WHEN user_function = 'Closer' THEN '✅ ACESSO À VISÃO CLOSER'
        WHEN user_function = 'Coordenador' THEN '✅ ACESSO À VISÃO COORDENADOR'
        WHEN user_function = 'SDR' OR user_function IS NULL THEN '⚠️ APENAS VISÃO SDR'
        ELSE '❌ SEM ACESSO'
    END as acesso_ote
FROM public.profiles
WHERE email ILIKE '%camila.ataliba%';

-- 7️⃣ LISTAR TODOS OS CLOSERS PARA COMPARAÇÃO
SELECT '========== TODOS OS CLOSERS NO SISTEMA ==========' as step;

SELECT 
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
FROM public.profiles p
WHERE p.user_function = 'Closer'
ORDER BY p.name;

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique a "SITUAÇÃO ATUAL" para entender o problema
-- 3. O script automaticamente corrige a função para 'Closer'
-- 4. Verifique a "VERIFICAÇÃO FINAL" para confirmar
-- 5. A Camila deve fazer LOGOUT e LOGIN novamente para carregar a nova função
-- 
-- IMPORTANTE: Após executar, peça para a Camila:
-- - Fazer logout da plataforma
-- - Fazer login novamente
-- - Verificar se a visão de Closer está disponível no OTE
-- ============================================


