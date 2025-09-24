-- 🔍 INVESTIGAR OS DADOS REAIS DA TABELA CALLS
-- Execute este script para ver os dados originais do banco

-- ===============================================================
-- ETAPA 1: Ver estrutura da tabela calls
-- ===============================================================

SELECT 
    'ESTRUTURA DA TABELA CALLS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;

-- ===============================================================
-- ETAPA 2: Ver dados reais das colunas enterprise e person
-- ===============================================================

SELECT 
    'DADOS REAIS DAS COLUNAS' as info,
    deal_id,
    enterprise,
    person,
    insights->>'enterprise' as insights_enterprise,
    insights->>'person' as insights_person,
    agent_id,
    created_at
FROM calls 
WHERE deal_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- ===============================================================
-- ETAPA 3: Verificar se existem colunas enterprise e person diretamente
-- ===============================================================

SELECT 
    'VERIFICAÇÃO DE COLUNAS DIRETAS' as info,
    COUNT(*) as total_calls,
    COUNT(enterprise) as calls_with_enterprise_column,
    COUNT(person) as calls_with_person_column,
    COUNT(CASE WHEN insights->>'enterprise' IS NOT NULL THEN 1 END) as calls_with_insights_enterprise,
    COUNT(CASE WHEN insights->>'person' IS NOT NULL THEN 1 END) as calls_with_insights_person
FROM calls;

-- ===============================================================
-- ETAPA 4: Ver todos os campos disponíveis em uma chamada
-- ===============================================================

SELECT 
    'EXEMPLO DE CHAMADA COMPLETA' as info,
    *
FROM calls 
WHERE deal_id = '64183'
LIMIT 1;

