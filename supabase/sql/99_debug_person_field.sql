-- ===================================================================
-- DEBUG PERSON FIELD - Investigar por que pessoa aparece como desconhecida
-- ===================================================================

-- 1. Verificar dados reais da coluna person
SELECT 
    '=== DADOS REAIS DA COLUNA PERSON ===' as info;

SELECT 
    id,
    person,
    insights->>'personName' as insights_person_name,
    insights->>'person' as insights_person,
    insights->'contact'->>'name' as insights_contact_name,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' AND TRIM(person) != 'null' THEN 
            'TEM PERSON: [' || person || ']'
        WHEN insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != '' THEN 
            'TEM INSIGHTS PERSON_NAME: [' || (insights->>'personName') || ']'
        WHEN insights->>'person' IS NOT NULL AND TRIM(insights->>'person') != '' THEN 
            'TEM INSIGHTS PERSON: [' || (insights->>'person') || ']'
        ELSE 
            'SEM DADOS DE PESSOA'
    END as status_pessoa,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar estatísticas da coluna person
SELECT 
    '=== ESTATÍSTICAS COLUNA PERSON ===' as info;

SELECT 
    'TOTAL CALLS' as tipo,
    COUNT(*) as quantidade
FROM calls
UNION ALL
SELECT 
    'COM PERSON PREENCHIDO' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person IS NOT NULL AND TRIM(person) != '' AND TRIM(person) != 'null'
UNION ALL
SELECT 
    'COM INSIGHTS PERSON_NAME' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != ''
UNION ALL
SELECT 
    'COM INSIGHTS PERSON' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE insights->>'person' IS NOT NULL AND TRIM(insights->>'person') != ''
UNION ALL
SELECT 
    'SEM DADOS DE PESSOA' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE (person IS NULL OR TRIM(person) = '' OR TRIM(person) = 'null')
AND (insights->>'personName' IS NULL OR TRIM(insights->>'personName') = '')
AND (insights->>'person' IS NULL OR TRIM(insights->>'person') = '');

-- 3. Testar lógica atual da função
SELECT 
    '=== TESTANDO LÓGICA ATUAL ===' as teste;

SELECT 
    id,
    person as person_original,
    insights->>'personName' as insights_person_name,
    insights->>'person' as insights_person,
    -- Reproduzir a lógica da função
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' AND TRIM(person) != 'null' THEN 
            'USARIA PERSON: ' || TRIM(person)
        WHEN insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != '' THEN 
            'USARIA INSIGHTS PERSON_NAME: ' || TRIM(insights->>'personName')
        WHEN insights->>'person' IS NOT NULL AND TRIM(insights->>'person') != '' THEN 
            'USARIA INSIGHTS PERSON: ' || TRIM(insights->>'person')
        ELSE 
            'USARIA FALLBACK: Pessoa Desconhecida'
    END as logica_aplicada
FROM calls 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar exemplos específicos que aparecem como "Pessoa Desconhecida"
SELECT 
    '=== EXEMPLOS COM PESSOA DESCONHECIDA ===' as exemplos;

SELECT 
    company_name,
    person_name,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0)
WHERE person_name = 'Pessoa Desconhecida'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Comparar com dados brutos dessas mesmas calls
SELECT 
    '=== DADOS BRUTOS DAS CALLS COM PESSOA DESCONHECIDA ===' as comparacao;

WITH calls_desconhecidas AS (
    SELECT id
    FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0)
    WHERE person_name = 'Pessoa Desconhecida'
    LIMIT 5
)
SELECT 
    c.id,
    c.person,
    c.insights->>'personName' as insights_person_name,
    c.insights->>'person' as insights_person,
    c.insights->'contact'->>'name' as insights_contact_name,
    LENGTH(COALESCE(c.person, '')) as person_length,
    c.created_at
FROM calls c
JOIN calls_desconhecidas cd ON c.id = cd.id
ORDER BY c.created_at DESC;

SELECT 'Debug da coluna person concluído!' as status;
