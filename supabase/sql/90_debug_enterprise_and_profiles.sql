-- ===================================================================
-- DEBUG ENTERPRISE E PROFILES - Investigar dados reais
-- ===================================================================

-- 1. Verificar dados reais da coluna enterprise
SELECT 
    '=== DADOS ENTERPRISE ===' as info;

SELECT 
    id,
    enterprise,
    deal_id,
    agent_id,
    created_at,
    CASE 
        WHEN enterprise IS NOT NULL AND TRIM(enterprise) != '' THEN 'TEM ENTERPRISE: [' || enterprise || ']'
        ELSE 'SEM ENTERPRISE'
    END as status_enterprise
FROM calls 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar estrutura da tabela profiles
SELECT 
    '=== ESTRUTURA PROFILES ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar dados da tabela profiles
SELECT 
    '=== DADOS PROFILES ===' as info;

SELECT 
    id,
    email,
    full_name,
    avatar_url,
    created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar mapeamento agent_id vs profiles
SELECT 
    '=== MAPEAMENTO AGENT_ID vs PROFILES ===' as info;

SELECT 
    c.agent_id as agent_id_calls,
    p.email as email_profiles,
    p.full_name as nome_profiles,
    COUNT(*) as quantidade_calls
FROM calls c
LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
GROUP BY c.agent_id, p.email, p.full_name
ORDER BY quantidade_calls DESC
LIMIT 10;

-- 5. Verificar agent_ids únicos nas calls
SELECT 
    '=== AGENT_IDS ÚNICOS ===' as info;

SELECT 
    agent_id,
    COUNT(*) as quantidade
FROM calls 
GROUP BY agent_id
ORDER BY quantidade DESC;

-- 6. Verificar emails únicos nos profiles
SELECT 
    '=== EMAILS ÚNICOS PROFILES ===' as info;

SELECT 
    email,
    full_name
FROM profiles 
ORDER BY email;
