-- ===================================================================
-- TESTAR COLUNA PERSON POPULADA - Verificar se está funcionando
-- ===================================================================

-- 1. Verificar dados populados na coluna person
SELECT 
    '=== VERIFICANDO DADOS POPULADOS ===' as info;

SELECT 
    deal_id,
    person,
    enterprise,
    LENGTH(COALESCE(person, '')) as person_length,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' THEN 'PERSON OK: ' || person
        ELSE 'PERSON VAZIO'
    END as status_person
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id;

-- 2. Estatísticas gerais da coluna person
SELECT 
    '=== ESTATÍSTICAS DA COLUNA PERSON ===' as stats;

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
    'CALLS COM PERSON VAZIO' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person IS NULL OR TRIM(person) = '';

-- 3. Testar função get_calls_with_filters com dados populados
SELECT 
    '=== TESTANDO FUNÇÃO COM DADOS POPULADOS ===' as teste_funcao;

SELECT 
    deal_id,
    company_name,
    person_name,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
ORDER BY created_at DESC;

-- 4. Verificar se ainda aparecem "Pessoa Desconhecida" ou "Contato XXXXX"
SELECT 
    '=== VERIFICANDO NOMES GENÉRICOS RESTANTES ===' as genericos;

SELECT 
    person_name,
    COUNT(*) as quantidade
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
WHERE person_name LIKE '%Desconhecida%' 
   OR person_name LIKE 'Contato %'
   OR person_name LIKE 'Cliente %'
GROUP BY person_name
ORDER BY quantidade DESC;

-- 5. Mostrar exemplos de nomes reais que agora aparecem
SELECT 
    '=== EXEMPLOS DE NOMES REAIS ===' as nomes_reais;

SELECT 
    deal_id,
    company_name,
    person_name,
    sdr_name
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0)
WHERE person_name NOT LIKE '%Desconhecida%' 
  AND person_name NOT LIKE 'Contato %'
  AND person_name NOT LIKE 'Cliente %'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Comparar dados brutos vs função para confirmar que está funcionando
SELECT 
    '=== COMPARAÇÃO DADOS BRUTOS vs FUNÇÃO ===' as comparacao;

-- Dados brutos
SELECT 
    'BRUTO' as source,
    deal_id,
    person as person_name_bruto,
    enterprise as company_name_bruto
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
UNION ALL
-- Dados da função  
SELECT 
    'FUNÇÃO' as source,
    deal_id,
    person_name as person_name_bruto,
    company_name as company_name_bruto
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 50, 0)
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id, source;

SELECT 'TESTE DA COLUNA PERSON POPULADA CONCLUÍDO!' as status;
