-- 🔧 CORREÇÃO: Priorizar scorecards por pipeline/etapa
-- Corrige o problema de seleção para respeitar a etapa da ligação

-- 1. Verificar scorecards existentes
SELECT 'Scorecards antes da correção:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 2. Configurar scorecards com especificidade adequada

-- 2.1. Scorecard "Ligação - Consultoria" (genérico - NÃO para apresentação)
UPDATE scorecards 
SET 
    target_call_types = ARRAY['consultoria'],
    target_pipelines = ARRAY['Qualificação', 'Descoberta de Necessidades', 'Agendamento', 'Follow-up'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Ligação - Consultoria';

-- 2.2. Scorecard "Scorecard Follow Up" (específico para apresentação)
UPDATE scorecards 
SET 
    target_call_types = ARRAY['consultoria'],
    target_pipelines = ARRAY['Apresentação de Proposta'],
    target_cadences = ARRAY['inbound', 'outbound']
WHERE name = 'Scorecard Follow Up';

-- 2.3. Criar scorecard específico para apresentação se não existir
INSERT INTO scorecards (
    name, 
    description, 
    active, 
    target_call_types, 
    target_pipelines, 
    target_cadences
)
SELECT 
    'Apresentação de Proposta - Consultoria',
    'Scorecard específico para apresentação de proposta em consultoria',
    true,
    ARRAY['consultoria'],
    ARRAY['Apresentação de Proposta'],
    ARRAY['inbound', 'outbound']
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards 
    WHERE name = 'Apresentação de Proposta - Consultoria'
);

-- 3. Verificar configuração após correção
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

-- 4. Testar seleção corrigida

-- 4.1. Teste: Consultoria + Apresentação de Proposta (deve selecionar scorecard específico)
SELECT 'Teste 1: Consultoria + Apresentação de Proposta (deve priorizar específico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

-- 4.2. Teste: Consultoria + Qualificação (deve usar genérico)
SELECT 'Teste 2: Consultoria + Qualificação (deve usar genérico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');

-- 4.3. Teste: Consultoria + Descoberta (deve usar genérico)
SELECT 'Teste 3: Consultoria + Descoberta de Necessidades (deve usar genérico):' as test_info;

SELECT 
    name,
    match_score,
    specificity_score,
    match_details,
    target_pipelines,
    ranking_position
FROM debug_scorecard_selection('consultoria', 'Descoberta de Necessidades', 'inbound');

-- 5. Verificar se ainda há conflitos
SELECT 'Conflitos após correção:' as info;
SELECT * FROM check_scorecard_conflicts();

-- 6. Teste final: Verificar se pipeline está sendo respeitado
SELECT 'RESULTADO FINAL - Pipeline deve ser respeitado:' as info;

-- Se pipeline = "Apresentação de Proposta" → deve selecionar scorecard específico
-- Se pipeline = "Qualificação" → deve selecionar scorecard genérico
SELECT 
    'Apresentação de Proposta' as pipeline_teste,
    name as scorecard_selecionado,
    match_score,
    specificity_score,
    target_pipelines
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound')
LIMIT 1;
