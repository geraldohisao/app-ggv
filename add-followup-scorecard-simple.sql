-- add-followup-scorecard-simple.sql
-- Script simples e direto para adicionar scorecard follow up
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- INSERIR SCORECARD FOLLOW UP
-- =========================================

INSERT INTO scorecards (id, name, description) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'Scorecard Follow Up',
    'Scorecard específico para ligações de follow up e apresentação de proposta'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- =========================================
-- LIMPAR CRITÉRIOS EXISTENTES
-- =========================================

DELETE FROM scorecard_criteria 
WHERE scorecard_id = '550e8400-e29b-41d4-a716-446655440001'::UUID;

-- =========================================
-- INSERIR CRITÉRIOS FOLLOW UP
-- =========================================

INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
VALUES 
    -- Abertura Follow Up (peso 10%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Abertura Follow Up', 'Abertura calorosa com referência à conversa anterior', 10, 3, 1),
    
    -- Reconexão e Rapport (peso 20%) 
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Reconexão e Rapport', 'Reconexão efetiva e estabelecimento de rapport', 20, 3, 2),
    
    -- Revisão de Necessidades (peso 30%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Revisão de Necessidades', 'Revisão completa das necessidades e validação de mudanças', 30, 3, 3),
    
    -- Apresentação da Proposta (peso 30%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Apresentação da Proposta', 'Apresentação clara da proposta com benefícios específicos e ROI', 30, 3, 4),
    
    -- Tratamento de Objeções (peso 20%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Tratamento de Objeções', 'Tratamento efetivo de objeções e manutenção da confiança', 20, 3, 5),
    
    -- Fechamento e Ação (peso 20%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Fechamento e Ação', 'Fechamento claro com próximos passos definidos', 20, 3, 6),
    
    -- Próximos Passos (peso 10%)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Próximos Passos', 'Próximos passos claros com prazos e responsabilidades', 10, 3, 7);

-- =========================================
-- VERIFICAÇÃO
-- =========================================

-- Verificar scorecard criado
SELECT 
    s.id,
    s.name,
    s.description,
    COUNT(sc.id) as total_criteria
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.id = '550e8400-e29b-41d4-a716-446655440001'::UUID
GROUP BY s.id, s.name, s.description;

-- Verificar critérios criados
SELECT 
    sc.name,
    sc.description,
    sc.weight,
    sc.max_score,
    sc.order_index
FROM scorecard_criteria sc
WHERE sc.scorecard_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
ORDER BY sc.order_index;
