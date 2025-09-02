-- TESTE DIRETO: Status atual da Camila no sistema
-- Execute este script no Supabase para verificar o acesso

-- 1. BUSCAR TODOS OS PERFIS DA CAMILA
SELECT 
    '=== PERFIS DA CAMILA ENCONTRADOS ===' as etapa,
    id,
    full_name,
    email,
    user_function,
    role,
    created_at,
    updated_at
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%'
ORDER BY created_at DESC;

-- 2. VERIFICAR LÓGICA DE ACESSO PARA CADA PERFIL
SELECT 
    '=== TESTE DE ACESSO - LÓGICA DO FRONTEND ===' as etapa,
    full_name,
    email,
    user_function,
    role,
    -- Lógica exata do OpportunityFeedbackPage.tsx
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN '✅ ACESSO POR SUPER_ADMIN'
        WHEN user_function = 'Closer' THEN '✅ ACESSO POR CLOSER'
        WHEN user_function = 'Gestor' THEN '✅ ACESSO POR GESTOR'
        ELSE '❌ SEM ACESSO'
    END as status_acesso_frontend,
    -- Verificação detalhada
    (role = 'SUPER_ADMIN') as is_super_admin,
    (user_function = 'Closer') as is_closer,
    (user_function = 'Gestor') as is_gestor,
    (role = 'SUPER_ADMIN' OR user_function IN ('Closer', 'Gestor')) as has_access
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 3. DIAGNÓSTICO DE PROBLEMAS POTENCIAIS
SELECT 
    '=== DIAGNÓSTICO DE PROBLEMAS ===' as etapa,
    full_name,
    user_function,
    role,
    CASE 
        WHEN user_function IS NULL THEN '⚠️ FUNÇÃO COMERCIAL NÃO DEFINIDA'
        WHEN user_function = 'SDR' THEN '❌ FUNÇÃO SDR - SEM ACESSO AO FEEDBACK'
        WHEN user_function NOT IN ('SDR', 'Closer', 'Gestor') THEN '❌ FUNÇÃO INVÁLIDA: ' || user_function
        WHEN user_function IN ('Closer', 'Gestor') THEN '✅ FUNÇÃO OK PARA FEEDBACK'
        ELSE '❓ SITUAÇÃO DESCONHECIDA'
    END as diagnostico
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 4. CORREÇÃO AUTOMÁTICA SE NECESSÁRIO
UPDATE profiles 
SET 
    user_function = 'Closer',
    updated_at = NOW()
WHERE (full_name ILIKE '%camila%' OR email ILIKE '%camila%')
  AND (user_function IS NULL OR user_function != 'Closer')
  AND role != 'SUPER_ADMIN';

-- 5. VERIFICAÇÃO PÓS-CORREÇÃO
SELECT 
    '=== APÓS CORREÇÃO AUTOMÁTICA ===' as etapa,
    full_name,
    email,
    user_function,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' OR user_function IN ('Closer', 'Gestor') THEN '✅ TEM ACESSO AO FEEDBACK'
        ELSE '❌ AINDA SEM ACESSO'
    END as status_final
FROM profiles 
WHERE full_name ILIKE '%camila%' 
   OR email ILIKE '%camila%';

-- 6. COMPARAÇÃO COM OUTROS USUÁRIOS QUE TÊM ACESSO
SELECT 
    '=== USUÁRIOS COM ACESSO AO FEEDBACK (PARA COMPARAÇÃO) ===' as etapa,
    full_name,
    email,
    user_function,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN 'SuperAdmin'
        WHEN user_function = 'Gestor' THEN 'Gestor'
        WHEN user_function = 'Closer' THEN 'Closer'
    END as tipo_acesso
FROM profiles 
WHERE role = 'SUPER_ADMIN' 
   OR user_function IN ('Closer', 'Gestor')
ORDER BY 
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN 1
        WHEN user_function = 'Gestor' THEN 2
        WHEN user_function = 'Closer' THEN 3
    END,
    full_name;

-- 7. INSTRUÇÕES PARA A CAMILA
SELECT 
    '=== INSTRUÇÕES PARA A CAMILA ===' as etapa,
    'Se o status_final acima mostrar ✅ TEM ACESSO, faça logout/login ou Ctrl+F5' as instrucao_1,
    'O menu "Feedback de Oportunidade" deve aparecer no canto superior direito' as instrucao_2,
    'Links diretos como /opportunity-feedback?deal_id=12345 devem funcionar' as instrucao_3;
