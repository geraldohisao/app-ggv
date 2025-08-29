-- ===================================================================
-- DEBUG EMPRESA DESCONHECIDA - Investigar problema de empresa
-- ===================================================================

-- 1. Verificar dados brutos das chamadas recentes
SELECT 
    id,
    deal_id,
    enterprise,
    person,
    agent_id,
    call_type,
    created_at,
    to_number,
    from_number,
    status
FROM calls 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se enterprise está NULL ou vazio
SELECT 
    'Chamadas com enterprise NULL' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE enterprise IS NULL
UNION ALL
SELECT 
    'Chamadas com enterprise vazio' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE enterprise = ''
UNION ALL
SELECT 
    'Chamadas com enterprise válido' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE enterprise IS NOT NULL AND enterprise != '';

-- 3. Verificar se person está NULL ou vazio
SELECT 
    'Chamadas com person NULL' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person IS NULL
UNION ALL
SELECT 
    'Chamadas com person vazio' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person = ''
UNION ALL
SELECT 
    'Chamadas com person válido' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE person IS NOT NULL AND person != '';

-- 4. Verificar estrutura da função get_calls_with_filters
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 5. Verificar se há dados de empresa/pessoa nas chamadas recentes
SELECT 
    id,
    CASE 
        WHEN enterprise IS NULL THEN 'NULL'
        WHEN enterprise = '' THEN 'VAZIO'
        ELSE enterprise
    END as enterprise_status,
    CASE 
        WHEN person IS NULL THEN 'NULL'
        WHEN person = '' THEN 'VAZIO'
        ELSE person
    END as person_status,
    deal_id,
    created_at
FROM calls 
WHERE created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Verificar se o problema está na conversão do frontend
-- Vamos ver os dados exatos que estão sendo retornados
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.deal_id,
    c.agent_id,
    c.to_number,
    c.from_number,
    c.status,
    c.duration,
    c.call_type,
    c.created_at,
    -- Verificar se há dados relacionados em outras tabelas
    CASE 
        WHEN c.enterprise IS NULL OR c.enterprise = '' THEN 'PROBLEMA: Enterprise vazio/null'
        ELSE 'OK: Enterprise preenchido'
    END as enterprise_check,
    CASE 
        WHEN c.person IS NULL OR c.person = '' THEN 'PROBLEMA: Person vazio/null'
        ELSE 'OK: Person preenchido'
    END as person_check
FROM calls c
WHERE c.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY c.created_at DESC
LIMIT 15;

-- 7. Verificar se há algum padrão nos dados problemáticos
SELECT 
    agent_id,
    call_type,
    status,
    COUNT(*) as chamadas_com_problema,
    COUNT(CASE WHEN enterprise IS NOT NULL AND enterprise != '' THEN 1 END) as com_enterprise,
    COUNT(CASE WHEN person IS NOT NULL AND person != '' THEN 1 END) as com_person
FROM calls 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY agent_id, call_type, status
ORDER BY chamadas_com_problema DESC;

SELECT 'Análise de dados concluída!' as status;
