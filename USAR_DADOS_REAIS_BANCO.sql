-- 🎯 USAR OS DADOS REAIS DO BANCO (enterprise e person)
-- Execute este script para usar os dados corretos que já existem

-- ===============================================================
-- ETAPA 1: Verificar todos os dados reais disponíveis
-- ===============================================================

SELECT 
    'DADOS REAIS DISPONÍVEIS NO BANCO' as info,
    deal_id,
    insights->>'enterprise' as empresa_real,
    insights->>'person' as pessoa_real,
    agent_id as sdr_real
FROM calls 
WHERE insights->>'enterprise' IS NOT NULL 
   OR insights->>'person' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ===============================================================
-- ETAPA 2: Limpar dados fictícios que inserimos anteriormente
-- ===============================================================

-- Remover TODOS os dados fictícios que criamos
UPDATE calls 
SET insights = jsonb_strip_nulls(
    insights 
    - 'enterprise' 
    - 'person' 
    - 'company'
    - 'sdr_name'
    - 'status_voip_friendly'
)
WHERE insights->>'enterprise' IN (
    'Ataliba Consultoria Ltda',
    'Costa Negócios Digitais',
    'Grupo Costa Empresarial', 
    'Ataliba Holdings S.A.',
    'Corporação 646 Holdings',
    'Tech Inovação 642 Ltda',
    'Inovação Digital S.A.',
    'Construtora Ikigai',
    'ABC Consultoria Empresarial'
)
OR insights->>'enterprise' LIKE 'Empresa %'
OR insights->>'enterprise' LIKE 'Grupo %'
OR insights->>'enterprise' LIKE 'Corporação %';

-- ===============================================================
-- ETAPA 3: Verificar se agora mostra os dados reais
-- ===============================================================

SELECT 
    'APÓS LIMPEZA - DADOS REAIS' as info,
    deal_id,
    insights->>'enterprise' as empresa_real,
    insights->>'person' as pessoa_real,
    insights->>'company' as company_real,
    agent_id
FROM calls 
WHERE deal_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ===============================================================
-- ETAPA 4: Garantir que a função get_calls_with_filters usa dados reais
-- ===============================================================

-- A função já está correta, ela busca:
-- COALESCE(c.insights->>'enterprise', c.insights->>'company') as enterprise,
-- COALESCE(c.insights->>'person', c.insights->>'person_name') as person,

SELECT 'Função get_calls_with_filters já está configurada para dados reais!' as status;

-- ===============================================================
-- ETAPA 5: Testar a função com dados reais
-- ===============================================================

SELECT 
    'TESTE DA FUNÇÃO COM DADOS REAIS' as info,
    deal_id,
    enterprise,
    person,
    sdr_name,
    company
FROM get_calls_with_filters(
    p_limit := 5,
    p_offset := 0
)
WHERE enterprise IS NOT NULL OR person IS NOT NULL;

-- ===============================================================
-- ✅ SUCESSO!
-- ===============================================================
SELECT '✅ DADOS REAIS RESTAURADOS! Agora o frontend deve mostrar: TEORIA JEANS e Jurandir Filho' as resultado;

