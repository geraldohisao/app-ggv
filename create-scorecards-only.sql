-- 🎯 CRIAR: Scorecards e Critérios Apenas
-- Este script cria apenas os scorecards e critérios, sem configurações de target

-- 1. Criar scorecard para "Oportunidade"
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
    ARRAY['Oportunidade'],
    ARRAY['Oportunidade'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
);

-- 2. Criar scorecard para "Reunião de Diagnóstico"
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
    ARRAY['Reunião de Diagnóstico'],
    ARRAY['Reunião de Diagnóstico'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
);

-- 3. Verificar scorecards criados
SELECT 'Scorecards criados:' as info;
SELECT 
    id,
    name,
    description,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE name IN ('Oportunidade - Confirmação', 'Reunião de Diagnóstico - Agendamento')
ORDER BY name;
