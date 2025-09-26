-- 🔧 CONFIGURAÇÃO: Definir pipelines/etapas para scorecards existentes
-- Este script configura os scorecards para usar seleção inteligente por etapa

-- 1. Verificar scorecards existentes
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 2. Configurar scorecard "Ligação - Consultoria" para NÃO incluir "Apresentação de Proposta"
UPDATE scorecards 
SET 
    target_pipelines = ARRAY['Qualificação', 'Descoberta de Necessidades', 'Agendamento']
WHERE name = 'Ligação - Consultoria';

-- 3. Criar/Configurar scorecard específico para "Apresentação de Proposta"
-- Primeiro, verificar se já existe
SELECT id, name FROM scorecards WHERE name LIKE '%Apresentação%' OR name LIKE '%Proposta%';

-- Se não existir, criar um novo scorecard para Apresentação de Proposta
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
    'Apresentação de Proposta',
    'Scorecard específico para chamadas na etapa de apresentação de proposta',
    true,
    ARRAY['consultoria', 'vendas'],
    ARRAY['Apresentação de Proposta', 'Proposta', 'Apresentação'],
    ARRAY['inbound', 'outbound'],
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards 
    WHERE name = 'Apresentação de Proposta'
);

-- 4. Adicionar critérios específicos para Apresentação de Proposta
-- (Você precisará configurar os critérios específicos via interface)

-- 5. Verificar configuração final
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

-- 6. Teste da seleção inteligente
SELECT 'Testando seleção para etapa "Apresentação de Proposta":' as test_info;

SELECT 
    name,
    match_score,
    match_details
FROM debug_scorecard_selection('consultoria', 'Apresentação de Proposta', 'inbound');

SELECT 'Testando seleção para etapa "Qualificação":' as test_info;

SELECT 
    name,
    match_score,
    match_details
FROM debug_scorecard_selection('consultoria', 'Qualificação', 'inbound');
