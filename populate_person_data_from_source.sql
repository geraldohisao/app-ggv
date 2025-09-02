-- ===================================================================
-- POPULAR DADOS DE PESSOA - Extrair de todas as fontes possíveis
-- ===================================================================

-- 1. Investigar TODAS as fontes possíveis de dados de pessoa
SELECT 
    '=== INVESTIGANDO TODAS AS FONTES DE DADOS ===' as info;

-- Verificar estrutura completa dos insights das calls
SELECT DISTINCT
    jsonb_object_keys(insights) as insight_keys
FROM calls 
WHERE insights IS NOT NULL 
    AND insights != '{}'::jsonb
LIMIT 20;

-- 2. Verificar dados completos dos insights para deal_id específico
SELECT 
    '=== DADOS COMPLETOS DOS INSIGHTS ===' as insights_data;

SELECT 
    id,
    deal_id,
    insights
FROM calls 
WHERE deal_id = '63236'
    AND insights IS NOT NULL
LIMIT 3;

-- 3. Verificar se existem outras tabelas com dados de pessoa
SELECT 
    '=== VERIFICANDO OUTRAS TABELAS ===' as outras_tabelas;

-- Verificar se existe tabela de deals/opportunities
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND (table_name LIKE '%deal%' 
         OR table_name LIKE '%opportunity%' 
         OR table_name LIKE '%contact%'
         OR table_name LIKE '%person%'
         OR table_name LIKE '%lead%')
ORDER BY table_name;

-- 4. Se existir tabela opportunity_feedbacks, verificar dados
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunity_feedbacks') THEN
        RAISE NOTICE 'Tabela opportunity_feedbacks existe - verificando dados...';
    END IF;
END $$;

-- Verificar opportunity_feedbacks se existir (com verificação defensiva)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunity_feedbacks') THEN
        -- Se existir, mostrar dados
        PERFORM 1; -- Placeholder - dados serão mostrados em query separada
        RAISE NOTICE 'Tabela opportunity_feedbacks encontrada!';
    ELSE
        RAISE NOTICE 'Tabela opportunity_feedbacks NÃO existe';
    END IF;
END $$;

-- 5. Verificar se há dados em outras colunas das calls
SELECT 
    '=== VERIFICANDO OUTRAS COLUNAS DAS CALLS ===' as outras_colunas;

SELECT 
    id,
    deal_id,
    from_number,
    to_number,
    agent_id,
    -- Verificar se há dados úteis em outras colunas JSON
    CASE WHEN insights IS NOT NULL THEN jsonb_pretty(insights) ELSE 'NULL' END as insights_pretty,
    CASE WHEN scorecard IS NOT NULL THEN jsonb_pretty(scorecard) ELSE 'NULL' END as scorecard_pretty
FROM calls 
WHERE deal_id = '63236'
LIMIT 2;

-- 6. Buscar padrões nos números de telefone para identificar pessoas
SELECT 
    '=== ANALISANDO NÚMEROS DE TELEFONE ===' as telefones;

SELECT 
    deal_id,
    from_number,
    to_number,
    COUNT(*) as qtd_calls,
    -- Tentar extrair informações dos números
    CASE 
        WHEN from_number IS NOT NULL THEN 'FROM: ' || from_number
        WHEN to_number IS NOT NULL THEN 'TO: ' || to_number
        ELSE 'SEM NÚMERO'
    END as numero_info
FROM calls 
WHERE deal_id = '63236'
GROUP BY deal_id, from_number, to_number;

-- 7. Verificar se existem dados de automação relacionados
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_history') THEN
        RAISE NOTICE 'Tabela automation_history existe - verificando...';
    END IF;
END $$;

-- Verificar automation_history se existir (com verificação defensiva)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_history') THEN
        RAISE NOTICE 'Tabela automation_history encontrada!';
    ELSE
        RAISE NOTICE 'Tabela automation_history NÃO existe';
    END IF;
END $$;

-- 8. Propor UPDATE baseado nos dados encontrados
SELECT 
    '=== PREPARANDO UPDATE BASEADO NOS DADOS ENCONTRADOS ===' as prepare_update;

-- Esta query vai ser ajustada baseada nos resultados acima
SELECT 
    'Execute o script completo primeiro para ver quais dados temos disponíveis' as instrucao;
