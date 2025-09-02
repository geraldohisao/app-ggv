-- CORREÇÃO DEFINITIVA: Acesso da Camila ao Feedback de Oportunidades
-- Problema: Camila foi alterada para 'Closer' mas não consegue acessar o sistema

-- 1. DIAGNÓSTICO ATUAL
SELECT 
    '=== DIAGNÓSTICO CAMILA ===' as etapa,
    id,
    full_name,
    email,
    user_function,
    role,
    created_at
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%'
ORDER BY created_at DESC;

-- 2. VERIFICAR SE EXISTE PERFIL DUPLICADO
SELECT 
    '=== VERIFICANDO DUPLICATAS ===' as etapa,
    COUNT(*) as total_camilas,
    string_agg(DISTINCT full_name, ', ') as nomes_encontrados,
    string_agg(DISTINCT email, ', ') as emails_encontrados
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 3. CORREÇÃO: Garantir que Camila tenha user_function = 'Closer'
UPDATE profiles 
SET 
    user_function = 'Closer',
    full_name = CASE 
        WHEN full_name IS NULL OR full_name = '' THEN 'Camila Ataliba'
        ELSE full_name 
    END,
    updated_at = NOW()
WHERE (full_name ILIKE '%camila%' OR email ILIKE '%camila%')
  AND user_function != 'Closer';

-- 4. VERIFICAÇÃO PÓS-CORREÇÃO
SELECT 
    '=== APÓS CORREÇÃO ===' as etapa,
    id,
    full_name,
    email,
    user_function,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN '✅ ACESSO POR SUPERADMIN'
        WHEN user_function = 'Closer' THEN '✅ ACESSO POR CLOSER'
        WHEN user_function = 'Gestor' THEN '✅ ACESSO POR GESTOR'
        WHEN user_function = 'SDR' THEN '❌ SEM ACESSO (SDR)'
        ELSE '❌ SEM ACESSO (função indefinida)'
    END as status_acesso
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 5. TESTE DE VALIDAÇÃO: Simular verificação do frontend
SELECT 
    '=== TESTE FRONTEND SIMULATION ===' as etapa,
    full_name,
    user_function,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN 'user.role === "SUPER_ADMIN" ✅'
        WHEN user_function IN ('Closer', 'Gestor') THEN 'user.user_function === "' || user_function || '" ✅'
        ELSE 'SEM ACESSO ❌'
    END as frontend_check,
    CASE 
        WHEN role = 'SUPER_ADMIN' OR user_function IN ('Closer', 'Gestor') THEN 'MENU VISÍVEL ✅'
        ELSE 'MENU OCULTO ❌'
    END as menu_visibility
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 6. VERIFICAR TODOS OS USUÁRIOS COM ACESSO AO FEEDBACK
SELECT 
    '=== TODOS COM ACESSO AO FEEDBACK ===' as etapa,
    full_name,
    email,
    user_function,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN 'SuperAdmin'
        WHEN user_function = 'Closer' THEN 'Closer'
        WHEN user_function = 'Gestor' THEN 'Gestor'
        ELSE 'SEM ACESSO'
    END as tipo_acesso
FROM profiles 
WHERE role = 'SUPER_ADMIN' 
   OR user_function IN ('Closer', 'Gestor')
ORDER BY 
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN 1
        WHEN user_function = 'Gestor' THEN 2
        WHEN user_function = 'Closer' THEN 3
        ELSE 4
    END,
    full_name;

-- 7. LOG DA OPERAÇÃO (Comentado - tabela debug_logs pode não ter estrutura adequada)
-- INSERT INTO debug_logs (operation, details, created_at) VALUES (...);

SELECT '=== OPERAÇÃO CONCLUÍDA ===' as resultado,
       'Camila configurada como Closer com acesso ao feedback' as status;
