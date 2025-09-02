-- ===================================================================
-- INVESTIGAÇÃO SIMPLES - Encontrar dados de pessoa
-- ===================================================================

-- 1. Ver todas as tabelas disponíveis
SELECT 
    'TABELAS DISPONÍVEIS:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Ver estrutura completa da tabela calls
SELECT 
    'COLUNAS DA TABELA CALLS:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'calls'
ORDER BY ordinal_position;

-- 3. Ver dados reais de uma call específica
SELECT 
    'DADOS COMPLETOS DE UMA CALL:' as info,
    *
FROM calls 
WHERE deal_id = '63236'
LIMIT 1;

-- 4. Ver se existem chaves nos insights
SELECT DISTINCT
    'CHAVES DOS INSIGHTS:' as info,
    jsonb_object_keys(insights) as chave
FROM calls 
WHERE insights IS NOT NULL 
    AND insights != '{}'::jsonb
LIMIT 10;

-- 5. Ver exemplos de insights completos
SELECT 
    'EXEMPLOS DE INSIGHTS:' as info,
    deal_id,
    insights
FROM calls 
WHERE insights IS NOT NULL 
    AND insights != '{}'::jsonb
LIMIT 3;
