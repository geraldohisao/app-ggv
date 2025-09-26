-- 🎯 CRIAR: Scorecards Específicos para Cada Etapa
-- Este script cria scorecards específicos para Oportunidade e Reunião de Diagnóstico

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

-- 2. Criar scorecard para "Oportunidade"
INSERT INTO scorecards (
    name,
    description,
    active,
    target_call_types,
    target_pipelines,
    target_cadences,
    created_at,
    updated_at
) VALUES (
    'Oportunidade - Confirmação',
    'Scorecard para ligações de oportunidade: confirmar call de diagnóstico, lembrar cliente do horário ou reagendar.',
    true,
    ARRAY['Oportunidade', 'Lead (Qualificação)', 'Qualificação'],
    ARRAY['Oportunidade', 'Qualificação'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
);

-- 3. Criar scorecard para "Reunião de Diagnóstico"
INSERT INTO scorecards (
    name,
    description,
    active,
    target_call_types,
    target_pipelines,
    target_cadences,
    created_at,
    updated_at
) VALUES (
    'Reunião de Diagnóstico - Agendamento',
    'Scorecard para ligações de reunião de diagnóstico: agendar, confirmar ou reagendar reunião de proposta.',
    true,
    ARRAY['Reunião de Diagnóstico', 'Apresentação de Proposta', 'Follow-up'],
    ARRAY['Reunião de Diagnóstico', 'Apresentação de Proposta'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
);

-- 4. Atualizar "Ligação - Consultoria" para incluir todas as etapas
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
        'Consultoria',
        'Oportunidade',
        'Reunião de Diagnóstico'
    ],
    target_pipelines = ARRAY[
        'Qualificação',
        'Descoberta de Necessidades',
        'Agendamento',
        'Apresentação de Proposta',
        'Follow-up',
        'Oportunidade',
        'Reunião de Diagnóstico'
    ],
    updated_at = NOW()
WHERE name = 'Ligação - Consultoria';

-- 5. Verificar scorecards após criação
SELECT '2. Scorecards após criação:' as info;
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

-- 6. Testar seleção para "Oportunidade"
SELECT '3. Teste de seleção para "Oportunidade":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Oportunidade', 'N/A', 'N/A');

-- 7. Testar seleção para "Reunião de Diagnóstico"
SELECT '4. Teste de seleção para "Reunião de Diagnóstico":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Reunião de Diagnóstico', 'N/A', 'N/A');

-- 8. Testar seleção para "Lead (Qualificação)"
SELECT '5. Teste de seleção para "Lead (Qualificação)":' as info;
SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    ranking_position
FROM debug_scorecard_selection('Lead (Qualificação)', 'N/A', 'N/A');
