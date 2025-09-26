-- 🔧 CONFIGURAÇÃO: Scorecards Específicos para Evitar Conflitos
-- Configura scorecards com especificidade adequada para evitar seleção ambígua

-- 1. Verificar scorecards existentes e conflitos
SELECT 'Scorecards existentes:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 2. Verificar conflitos por pipeline
SELECT 'Conflitos detectados:' as info;
SELECT * FROM check_scorecard_conflicts();

-- 3. Configurar scorecards com especificidade adequada

-- 3.1. Scorecard "Ligação - Consultoria" (genérico para consultoria)
UPDATE scorecards 
SET 
    target_call_types = ARRAY['consultoria'],
    target_pipelines = ARRAY['Qualificação', 'Descoberta de Necessidades', 'Agendamento'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Ligação - Consultoria';

-- 3.2. Scorecard "Apresentação de Proposta" (específico para consultoria + apresentação)
UPDATE scorecards 
SET 
    target_call_types = ARRAY['consultoria'],
    target_pipelines = ARRAY['Apresentação de Proposta'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Apresentação de Proposta';

-- 3.3. Criar scorecard específico para vendas + apresentação (se necessário)
INSERT INTO scorecards (
    name, 
    description, 
    active, 
    target_call_types, 
    target_pipelines, 
    target_cadences,
    created_at,
    updated_at
)
SELECT 
    'Apresentação de Proposta - Vendas',
    'Scorecard específico para apresentação de proposta em vendas',
    true,
    ARRAY['vendas'],
    ARRAY['Apresentação de Proposta'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards 
    WHERE name = 'Apresentação de Proposta - Vendas'
);

-- 3.4. Criar scorecard para follow-up (específico)
INSERT INTO scorecards (
    name, 
    description, 
    active, 
    target_call_types, 
    target_pipelines, 
    target_cadences,
    created_at,
    updated_at
)
SELECT 
    'Follow-up de Proposta',
    'Scorecard para chamadas de follow-up após apresentação de proposta',
    true,
    ARRAY['consultoria', 'vendas'],
    ARRAY['Follow-up', 'Acompanhamento'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards 
    WHERE name = 'Follow-up de Proposta'
);

-- 4. Verificar configuração final
SELECT 'Configuração final dos scorecards:' as info;
SELECT 
    s.id,
    s.name,
    s.active,
    s.target_call_types,
    s.target_pipelines,
    s.target_cadences,
    COUNT(sc.id) as criteria_count
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.active, s.target_call_types, s.target_pipelines, s.target_cadences
ORDER BY s.name;

-- 5. Testar seleção para diferentes cenários

-- 5.1. Teste: Consultoria + Apresentação de Proposta
SELECT 'Teste 1: Consultoria + Apresentação de Proposta' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

-- 5.2. Teste: Vendas + Apresentação de Proposta  
SELECT 'Teste 2: Vendas + Apresentação de Proposta' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('vendas', 'Apresentação de Proposta', 'inbound');

-- 5.3. Teste: Consultoria + Qualificação
SELECT 'Teste 3: Consultoria + Qualificação' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');

-- 5.4. Teste: Follow-up
SELECT 'Teste 4: Follow-up' as test_info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Follow-up', 'inbound');

-- 6. Verificar se ainda há conflitos
SELECT 'Conflitos após configuração:' as info;
SELECT * FROM check_scorecard_conflicts();
