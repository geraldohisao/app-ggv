-- 🔧 CORREÇÃO: Mapear pipeline corretamente
-- O problema é que pipeline está vindo como nome da empresa ao invés da etapa

-- 1. Verificar dados reais das chamadas
SELECT 'Dados reais das chamadas:' as info;
SELECT 
    id,
    call_type,
    insights->>'pipeline' as pipeline_from_insights,
    insights->>'deal_stage' as deal_stage_from_insights,
    insights->>'stage' as stage_from_insights,
    insights->>'company' as company_from_insights
FROM calls 
WHERE transcription IS NOT NULL 
AND transcription != ''
LIMIT 5;

-- 2. Verificar scorecards configurados
SELECT 'Scorecards configurados:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 3. Testar seleção com dados reais
SELECT 'Teste com dados reais da chamada:' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection(
    'Apresentação de Proposta',  -- call_type
    'GGV Inteligência em Vendas',  -- pipeline (nome da empresa)
    'Inbound - Consultoria (-100k/mês)'  -- cadence
);

-- 4. Testar seleção corrigida (usando call_type como pipeline)
SELECT 'Teste corrigido (usando call_type como pipeline):' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection(
    'consultoria',  -- call_type genérico
    'Apresentação de Proposta',  -- pipeline (etapa real)
    'inbound'  -- cadence genérico
);

-- 5. Configurar scorecards para aceitar call_type como pipeline
-- 5.1. Atualizar "Scorecard Follow Up" para aceitar "Apresentação de Proposta" como call_type
UPDATE scorecards 
SET 
    target_call_types = ARRAY['Apresentação de Proposta', 'consultoria'],
    target_pipelines = ARRAY['Apresentação de Proposta'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Scorecard Follow Up';

-- 5.2. Atualizar "Ligação - Consultoria" para ser mais genérico
UPDATE scorecards 
SET 
    target_call_types = ARRAY['consultoria', 'Qualificação', 'Descoberta de Necessidades', 'Agendamento'],
    target_pipelines = ARRAY['Qualificação', 'Descoberta de Necessidades', 'Agendamento'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Ligação - Consultoria';

-- 6. Verificar configuração após correção
SELECT 'Scorecards após correção:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 7. Testar seleção corrigida
SELECT 'Teste final com dados reais:' as info;

-- 7.1. Teste: Apresentação de Proposta (deve selecionar específico)
SELECT 'Teste 1: Apresentação de Proposta (deve selecionar específico):' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection(
    'Apresentação de Proposta',  -- call_type
    'GGV Inteligência em Vendas',  -- pipeline (empresa)
    'Inbound - Consultoria (-100k/mês)'  -- cadence
);

-- 7.2. Teste: Consultoria genérico (deve usar genérico)
SELECT 'Teste 2: Consultoria genérico (deve usar genérico):' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection(
    'consultoria',  -- call_type genérico
    'GGV Inteligência em Vendas',  -- pipeline (empresa)
    'inbound'  -- cadence genérico
);

-- 8. Verificar conflitos
SELECT 'Conflitos após correção:' as info;
SELECT * FROM check_scorecard_conflicts();
