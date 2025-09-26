-- 🧹 LIMPEZA: Manter apenas scorecards essenciais
-- Este script remove scorecards desnecessários e mantém apenas:
-- 1. Scorecard Follow Up
-- 2. Ligação - Consultoria

-- 1. Verificar scorecards atuais
SELECT '1. Scorecards atuais:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 2. Desativar todos os scorecards primeiro
UPDATE scorecards
SET 
    active = false,
    updated_at = NOW();

-- 3. Ativar apenas "Scorecard Follow Up"
UPDATE scorecards
SET 
    active = true,
    updated_at = NOW()
WHERE name = 'Scorecard Follow Up';

-- 4. Ativar apenas "Ligação - Consultoria"
UPDATE scorecards
SET 
    active = true,
    updated_at = NOW()
WHERE name = 'Ligação - Consultoria';

-- 5. Verificar scorecards ativos após limpeza
SELECT '2. Scorecards ativos após limpeza:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
ORDER BY name;

-- 6. Atualizar "Ligação - Consultoria" para incluir todos os call_types necessários
UPDATE scorecards
SET 
    target_call_types = ARRAY[
        'Ligação',
        'Lead (Qualificação)',
        'Qualificação',
        'Descoberta de Necessidades',
        'Agendamento',
        'Apresentação de Proposta',
        'Follow-up',
        'Consultoria'
    ],
    target_pipelines = ARRAY[
        'Qualificação',
        'Descoberta de Necessidades',
        'Agendamento',
        'Apresentação de Proposta',
        'Follow-up'
    ],
    target_cadences = ARRAY['inbound', 'outbound'],
    updated_at = NOW()
WHERE name = 'Ligação - Consultoria';

-- 7. Verificar scorecard "Ligação - Consultoria" atualizado
SELECT '3. Scorecard "Ligação - Consultoria" atualizado:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE name = 'Ligação - Consultoria';

-- 8. Testar seleção para "Lead (Qualificação)"
SELECT '4. Teste de seleção para "Lead (Qualificação)":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Lead (Qualificação)', 'N/A', 'N/A');

-- 9. Testar seleção para "Ligação"
SELECT '5. Teste de seleção para "Ligação":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Ligação', 'N/A', 'N/A');
