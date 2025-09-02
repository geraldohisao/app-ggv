-- ===================================================================
-- DEBUG PERSON COLUMN REAL - Investigar por que não está usando person
-- ===================================================================

-- 1. Verificar dados reais da coluna person nas calls específicas
SELECT 
    '=== DADOS REAIS DAS CALLS ESPECÍFICAS ===' as info;

SELECT 
    id,
    deal_id,
    person,
    enterprise,
    insights->>'personName' as insights_person_name,
    insights->>'person' as insights_person,
    insights->'contact'->>'name' as insights_contact_name,
    LENGTH(COALESCE(person, '')) as person_length,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' AND TRIM(person) != 'null' THEN 
            'TEM PERSON: [' || person || ']'
        ELSE 'SEM PERSON VÁLIDO'
    END as status_person,
    created_at
FROM calls 
WHERE deal_id = '63236'  -- Deal específico da imagem
ORDER BY created_at DESC;

-- 2. Testar a lógica COALESCE atual step by step
SELECT 
    '=== TESTANDO LÓGICA COALESCE STEP BY STEP ===' as teste;

SELECT 
    id,
    deal_id,
    -- Testar cada condição individualmente
    CASE 
        WHEN person IS NOT NULL 
            AND TRIM(person) != '' 
            AND TRIM(person) != 'null'
            AND LENGTH(TRIM(person)) > 1
        THEN 'STEP 1 OK: ' || TRIM(person)
        ELSE 'STEP 1 FAIL: person=[' || COALESCE(person, 'NULL') || ']'
    END as step1_person,
    
    CASE 
        WHEN insights->>'personName' IS NOT NULL 
            AND TRIM(insights->>'personName') != '' 
            AND LENGTH(TRIM(insights->>'personName')) > 1
        THEN 'STEP 2 OK: ' || TRIM(insights->>'personName')
        ELSE 'STEP 2 FAIL: personName=[' || COALESCE(insights->>'personName', 'NULL') || ']'
    END as step2_insights_person_name,
    
    CASE 
        WHEN insights->>'person' IS NOT NULL 
            AND TRIM(insights->>'person') != '' 
            AND LENGTH(TRIM(insights->>'person')) > 1
        THEN 'STEP 3 OK: ' || TRIM(insights->>'person')
        ELSE 'STEP 3 FAIL: person=[' || COALESCE(insights->>'person', 'NULL') || ']'
    END as step3_insights_person,
    
    CASE 
        WHEN insights->'contact'->>'name' IS NOT NULL 
            AND TRIM(insights->'contact'->>'name') != '' 
            AND LENGTH(TRIM(insights->'contact'->>'name')) > 1
        THEN 'STEP 4 OK: ' || TRIM(insights->'contact'->>'name')
        ELSE 'STEP 4 FAIL: contact.name=[' || COALESCE(insights->'contact'->>'name', 'NULL') || ']'
    END as step4_contact_name
    
FROM calls 
WHERE deal_id = '63236'
ORDER BY created_at DESC;

-- 3. Verificar o que a função está retornando vs dados brutos
SELECT 
    '=== COMPARAÇÃO FUNÇÃO vs DADOS BRUTOS ===' as comparacao;

-- Dados da função
SELECT 
    'FUNÇÃO' as source,
    deal_id,
    company_name,
    person_name,
    sdr_name
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
WHERE deal_id = '63236';

-- Dados brutos
SELECT 
    'BRUTO' as source,
    deal_id,
    COALESCE(enterprise, 'SEM ENTERPRISE') as company_name,
    COALESCE(person, 'SEM PERSON') as person_name,
    agent_id as sdr_name
FROM calls
WHERE deal_id = '63236';

-- 4. Verificar se o UPDATE populou os dados corretamente
SELECT 
    '=== VERIFICANDO SE UPDATE FUNCIONOU ===' as update_check;

SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN person IS NOT NULL AND TRIM(person) != '' THEN 1 END) as calls_com_person,
    COUNT(CASE WHEN enterprise IS NOT NULL AND TRIM(enterprise) != '' THEN 1 END) as calls_com_enterprise,
    COUNT(CASE WHEN insights IS NOT NULL THEN 1 END) as calls_com_insights
FROM calls;

-- 5. Ver exemplos de calls que deveriam ter person mas não têm
SELECT 
    '=== CALLS QUE DEVERIAM TER PERSON ===' as should_have_person;

SELECT 
    id,
    deal_id,
    person,
    insights->>'personName' as should_be_person,
    CASE 
        WHEN person IS NULL OR TRIM(person) = '' THEN 'PERSON VAZIO'
        ELSE 'PERSON OK'
    END as person_status,
    CASE 
        WHEN insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != '' THEN 'TEM DADOS PARA COPIAR'
        ELSE 'SEM DADOS NOS INSIGHTS'
    END as insights_status
FROM calls 
WHERE deal_id = '63236'
   OR (insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != '')
ORDER BY created_at DESC
LIMIT 5;
