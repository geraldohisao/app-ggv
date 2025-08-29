-- 50_check_real_data_structure.sql
-- VERIFICAR ESTRUTURA REAL DOS DADOS

-- =========================================
-- 1. VERIFICAR ESTRUTURA DA TABELA CALLS
-- =========================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'calls'
ORDER BY ordinal_position;

-- =========================================
-- 2. VERIFICAR AMOSTRA DE DADOS REAIS
-- =========================================

-- Ver 3 registros completos para entender a estrutura
SELECT * FROM calls LIMIT 3;

-- =========================================
-- 3. VERIFICAR CONTEÚDO DO CAMPO INSIGHTS
-- =========================================

-- Ver o que realmente tem no campo insights
SELECT 
    id,
    deal_id,
    agent_id,
    insights,
    jsonb_pretty(insights) as insights_formatted
FROM calls 
WHERE insights IS NOT NULL 
AND insights != '{}'::jsonb
LIMIT 5;

-- =========================================
-- 4. VERIFICAR CHAVES DISPONÍVEIS NO JSONB
-- =========================================

-- Listar todas as chaves únicas no campo insights
SELECT DISTINCT 
    jsonb_object_keys(insights) as insight_keys
FROM calls 
WHERE insights IS NOT NULL 
AND insights != '{}'::jsonb;

-- =========================================
-- 5. VERIFICAR DADOS DE EMPRESA E PESSOA
-- =========================================

-- Tentar extrair dados de empresa e pessoa de várias formas
SELECT 
    id,
    deal_id,
    agent_id,
    -- Tentativas de extrair empresa
    insights->>'company' as company_1,
    insights->>'companyName' as company_2,
    insights->>'enterprise' as company_3,
    insights->'metadata'->>'company' as company_4,
    insights->'deal'->>'company' as company_5,
    -- Tentativas de extrair pessoa
    insights->>'person' as person_1,
    insights->>'person_name' as person_2,
    insights->>'contact' as person_3,
    insights->'contact'->>'name' as person_4,
    insights->'person'->>'name' as person_5,
    -- Ver o JSON completo
    insights
FROM calls 
LIMIT 10;

-- =========================================
-- 6. VERIFICAR SE HÁ TABELA DE DEALS
-- =========================================

-- Verificar se existe tabela de deals/empresas
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%deal%' 
    OR table_name LIKE '%company%' 
    OR table_name LIKE '%enterprise%'
    OR table_name LIKE '%person%'
    OR table_name LIKE '%contact%'
);

-- =========================================
-- 7. CONTAR REGISTROS COM DADOS ÚTEIS
-- =========================================

SELECT 
    'Total de calls' as info,
    COUNT(*) as quantidade
FROM calls
UNION ALL
SELECT 
    'Calls com deal_id',
    COUNT(*) 
FROM calls 
WHERE deal_id IS NOT NULL AND deal_id != ''
UNION ALL
SELECT 
    'Calls com insights não vazio',
    COUNT(*) 
FROM calls 
WHERE insights IS NOT NULL AND insights != '{}'::jsonb
UNION ALL
SELECT 
    'Calls com company em insights',
    COUNT(*) 
FROM calls 
WHERE insights->>'company' IS NOT NULL
UNION ALL
SELECT 
    'Calls com enterprise em insights',
    COUNT(*) 
FROM calls 
WHERE insights->>'enterprise' IS NOT NULL;
