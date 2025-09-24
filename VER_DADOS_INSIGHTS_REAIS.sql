-- 🔍 VER OS DADOS REAIS NA COLUNA INSIGHTS
-- Execute para ver o que realmente existe no banco

-- ===============================================================
-- ETAPA 1: Ver os dados reais da coluna insights
-- ===============================================================

SELECT 
    'DADOS REAIS DA COLUNA INSIGHTS' as info,
    deal_id,
    insights,
    jsonb_pretty(insights) as insights_formatado
FROM calls 
WHERE deal_id IN ('64183', '64663', '64712', '64226')
ORDER BY deal_id;

-- ===============================================================
-- ETAPA 2: Ver quais chaves existem na coluna insights
-- ===============================================================

SELECT 
    'CHAVES DISPONÍVEIS NO INSIGHTS' as info,
    deal_id,
    jsonb_object_keys(insights) as chave_disponivel
FROM calls 
WHERE deal_id IS NOT NULL 
  AND insights != '{}'::jsonb
LIMIT 20;

-- ===============================================================
-- ETAPA 3: Ver dados originais sem nossa alteração
-- ===============================================================

SELECT 
    'DADOS ORIGINAIS (ANTES DA NOSSA ALTERAÇÃO)' as info,
    deal_id,
    agent_id,
    from_number,
    to_number,
    transcription,
    insights
FROM calls 
WHERE deal_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ===============================================================
-- ETAPA 4: Limpar dados fictícios que inserimos
-- ===============================================================

-- Remover os dados fictícios que inserimos
UPDATE calls 
SET insights = '{}'::jsonb
WHERE insights->>'enterprise' IN (
    'Ataliba Consultoria Ltda',
    'Costa Negócios Digitais', 
    'Grupo Costa Empresarial',
    'Ataliba Holdings S.A.'
);

-- ===============================================================
-- ETAPA 5: Ver como ficou após limpar
-- ===============================================================

SELECT 
    'APÓS LIMPAR DADOS FICTÍCIOS' as info,
    deal_id,
    insights,
    agent_id,
    transcription IS NOT NULL as tem_transcricao
FROM calls 
WHERE deal_id IN ('64183', '64663', '64712', '64226')
ORDER BY deal_id;

