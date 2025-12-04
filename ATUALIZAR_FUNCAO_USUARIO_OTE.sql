-- ============================================
-- SCRIPT GENÉRICO: Atualizar Função de Usuário no OTE
-- ============================================
-- Use este script para atualizar a função comercial de QUALQUER usuário
-- Funções disponíveis: 'SDR', 'Closer', 'Coordenador'

-- ============================================
-- PASSO 1: LISTAR TODOS OS USUÁRIOS
-- ============================================
SELECT '========== TODOS OS USUÁRIOS ==========' as step;

SELECT 
    u.email,
    p.name,
    p.role,
    p.user_function,
    CASE 
        WHEN p.role IN ('SUPER_ADMIN', 'ADMIN') THEN '👑 Admin (Acesso Total)'
        WHEN p.user_function = 'Closer' THEN '🎯 Closer'
        WHEN p.user_function = 'Coordenador' THEN '📊 Coordenador'
        WHEN p.user_function = 'SDR' THEN '📞 SDR'
        ELSE '⚠️ Sem função definida'
    END as visao_ote
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY p.name;

-- ============================================
-- PASSO 2: ATUALIZAR FUNÇÃO DE UM USUÁRIO ESPECÍFICO
-- ============================================

-- 🎯 EXEMPLO 1: Definir como CLOSER
-- Substitua 'email@exemplo.com' pelo email do usuário
/*
UPDATE public.profiles
SET user_function = 'Closer'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'email@exemplo.com'
)
RETURNING email, name, role, user_function;
*/

-- 📊 EXEMPLO 2: Definir como COORDENADOR
-- Substitua 'email@exemplo.com' pelo email do usuário
/*
UPDATE public.profiles
SET user_function = 'Coordenador'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'email@exemplo.com'
)
RETURNING email, name, role, user_function;
*/

-- 📞 EXEMPLO 3: Definir como SDR
-- Substitua 'email@exemplo.com' pelo email do usuário
/*
UPDATE public.profiles
SET user_function = 'SDR'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'email@exemplo.com'
)
RETURNING email, name, role, user_function;
*/

-- ============================================
-- PASSO 3: ATUALIZAR VÁRIOS USUÁRIOS DE UMA VEZ
-- ============================================

-- 🎯 EXEMPLO: Definir vários usuários como Closer
/*
UPDATE public.profiles
SET user_function = 'Closer'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN (
        'usuario1@grupoggv.com',
        'usuario2@grupoggv.com',
        'usuario3@grupoggv.com'
    )
)
RETURNING email, name, user_function;
*/

-- ============================================
-- PASSO 4: CRIAR PROFILE SE NÃO EXISTIR
-- ============================================

-- Se o usuário não tiver profile, crie um com a função desejada
-- Substitua 'email@exemplo.com' e 'Closer' conforme necessário
/*
INSERT INTO public.profiles (id, role, user_function, email, name)
SELECT 
    u.id,
    'USER' as role,
    'Closer' as user_function,  -- ⬅️ Altere aqui: 'SDR', 'Closer', ou 'Coordenador'
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.email
    ) as name
FROM auth.users u
WHERE u.email = 'email@exemplo.com'  -- ⬅️ Altere aqui
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE
SET 
    user_function = 'Closer',  -- ⬅️ Altere aqui
    email = EXCLUDED.email,
    name = EXCLUDED.name
RETURNING email, name, role, user_function;
*/

-- ============================================
-- PASSO 5: VERIFICAR USUÁRIOS SEM FUNÇÃO DEFINIDA
-- ============================================
SELECT '========== USUÁRIOS SEM FUNÇÃO DEFINIDA ==========' as step;

SELECT 
    u.email,
    p.name,
    p.role,
    p.user_function,
    '⚠️ Precisa definir função' as alerta
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.user_function IS NULL
AND p.role NOT IN ('SUPER_ADMIN', 'ADMIN')  -- Admins não precisam
ORDER BY p.name;

-- ============================================
-- PASSO 6: ESTATÍSTICAS POR FUNÇÃO
-- ============================================
SELECT '========== ESTATÍSTICAS POR FUNÇÃO ==========' as step;

SELECT 
    COALESCE(user_function, 'Sem função') as funcao,
    COUNT(*) as total_usuarios,
    STRING_AGG(email, ', ') as usuarios
FROM public.profiles
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')  -- Excluir admins da contagem
GROUP BY user_function
ORDER BY total_usuarios DESC;

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 
-- 1️⃣ LISTAR USUÁRIOS:
--    Execute o PASSO 1 para ver todos os usuários e suas funções atuais
--
-- 2️⃣ ATUALIZAR UM USUÁRIO:
--    Descomente um dos exemplos do PASSO 2
--    Substitua 'email@exemplo.com' pelo email real
--    Execute o comando
--
-- 3️⃣ ATUALIZAR VÁRIOS USUÁRIOS:
--    Descomente o exemplo do PASSO 3
--    Liste todos os emails que quer atualizar
--    Execute o comando
--
-- 4️⃣ CRIAR PROFILE:
--    Se o usuário não aparecer na lista, use o PASSO 4
--    para criar o profile com a função correta
--
-- 5️⃣ VERIFICAR:
--    Execute PASSO 1 novamente para confirmar
--
-- ⚠️ IMPORTANTE: 
-- Após qualquer alteração, o usuário precisa:
-- - Fazer LOGOUT da plataforma
-- - Fazer LOGIN novamente
-- - A nova visão do OTE aparecerá automaticamente
--
-- ============================================
-- FUNÇÕES DISPONÍVEIS E SUAS VISÕES:
-- ============================================
-- 
-- 'SDR'          → Vê apenas visão SDR
-- 'Closer'       → Vê apenas visão Closer
-- 'Coordenador'  → Vê apenas visão Coordenador
-- SUPER_ADMIN    → Vê TODAS as visões (não precisa user_function)
-- ADMIN          → Vê TODAS as visões (não precisa user_function)
--
-- ============================================


