-- ===================================================================
-- UPDATE PERSON FROM INSIGHTS FINAL - Popular dados de pessoa
-- ===================================================================

-- 1. Verificar dados atuais antes do update
SELECT 
    '=== DADOS ANTES DO UPDATE ===' as info;

SELECT 
    deal_id,
    person,
    insights->>'contact_name' as insights_contact_name,
    insights->'contact'->>'name' as insights_contact_name_nested,
    insights->>'company' as insights_company,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' THEN 'TEM PERSON'
        ELSE 'SEM PERSON'
    END as status_person
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id;

-- 2. UPDATE para popular coluna person baseado nos insights
UPDATE calls 
SET 
    person = CASE 
        -- Prioridade 1: insights->>'contact_name' (mais direto)
        WHEN insights->>'contact_name' IS NOT NULL 
            AND TRIM(insights->>'contact_name') != '' 
            AND TRIM(insights->>'contact_name') != 'null'
        THEN TRIM(insights->>'contact_name')
        
        -- Prioridade 2: insights->'contact'->>'name' (estrutura aninhada)
        WHEN insights->'contact'->>'name' IS NOT NULL 
            AND TRIM(insights->'contact'->>'name') != '' 
            AND TRIM(insights->'contact'->>'name') != 'null'
        THEN TRIM(insights->'contact'->>'name')
        
        -- Manter valor atual se já existir
        ELSE person
    END,
    
    -- Também popular enterprise se estiver vazia
    enterprise = CASE 
        WHEN (enterprise IS NULL OR TRIM(enterprise) = '') 
            AND insights->>'company' IS NOT NULL 
            AND TRIM(insights->>'company') != '' 
            AND TRIM(insights->>'company') != 'null'
        THEN TRIM(insights->>'company')
        
        -- Alternativa: companyName
        WHEN (enterprise IS NULL OR TRIM(enterprise) = '') 
            AND insights->>'companyName' IS NOT NULL 
            AND TRIM(insights->>'companyName') != '' 
            AND TRIM(insights->>'companyName') != 'null'
        THEN TRIM(insights->>'companyName')
        
        -- Manter valor atual se já existir
        ELSE enterprise
    END
    
WHERE 
    insights IS NOT NULL 
    AND insights != '{}'::jsonb
    AND (
        -- Só atualizar se person estiver vazio OU se temos dados melhores nos insights
        person IS NULL 
        OR TRIM(person) = '' 
        OR (
            insights->>'contact_name' IS NOT NULL 
            AND TRIM(insights->>'contact_name') != ''
        )
        OR (
            insights->'contact'->>'name' IS NOT NULL 
            AND TRIM(insights->'contact'->>'name') != ''
        )
    );

-- 3. Verificar dados após o update
SELECT 
    '=== DADOS APÓS O UPDATE ===' as info;

SELECT 
    deal_id,
    person,
    enterprise,
    insights->>'contact_name' as insights_contact_name,
    insights->'contact'->>'name' as insights_contact_name_nested,
    insights->>'company' as insights_company,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' THEN 'PERSON ATUALIZADO'
        ELSE 'PERSON AINDA VAZIO'
    END as status_person
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id;

-- 4. Estatísticas gerais do update
SELECT 
    '=== ESTATÍSTICAS DO UPDATE ===' as stats;

SELECT 
    'TOTAL CALLS' as tipo,
    COUNT(*) as quantidade
FROM calls
UNION ALL
SELECT 
    'CALLS COM PERSON PREENCHIDO' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person IS NOT NULL AND TRIM(person) != ''
UNION ALL
SELECT 
    'CALLS COM ENTERPRISE PREENCHIDO' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE enterprise IS NOT NULL AND TRIM(enterprise) != ''
UNION ALL
SELECT 
    'CALLS COM INSIGHTS' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE insights IS NOT NULL AND insights != '{}'::jsonb;

-- 5. Testar a função get_calls_with_filters após o update
SELECT 
    '=== TESTANDO FUNÇÃO APÓS UPDATE ===' as teste_funcao;

SELECT 
    deal_id,
    company_name,
    person_name,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id;

-- 6. Verificar se ainda existem "Contato XXXXX" genéricos
SELECT 
    '=== VERIFICANDO NOMES GENÉRICOS ===' as genericos;

SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN person_name LIKE 'Contato %' THEN 1 END) as contatos_genericos,
    COUNT(CASE WHEN person_name NOT LIKE 'Contato %' AND person_name NOT LIKE '%Desconhecida%' THEN 1 END) as nomes_reais
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0);

SELECT 'UPDATE DE DADOS DE PESSOA CONCLUÍDO!' as status;
