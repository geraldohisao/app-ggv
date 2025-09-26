-- add-followup-scorecard.sql
-- Adiciona scorecard específico para ligações de follow up
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- INSERIR NOVO SCORECARD DE FOLLOW UP
-- =========================================

INSERT INTO scorecards (id, name, description) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'Scorecard Follow Up',
    'Scorecard específico para ligações de follow up e apresentação de proposta'
);

-- =========================================
-- INSERIR CRITÉRIOS DO SCORECARD FOLLOW UP
-- =========================================

INSERT INTO scorecard_criteria (scorecard_id, text, category, weight, order_index)
VALUES 
    -- Abertura Follow Up (peso 1)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Abertura calorosa com referência à conversa anterior', 'Abertura', 10, 1),
    
    -- Reconexão e Rapport (peso 2) 
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Reconexão efetiva e estabelecimento de rapport', 'Rapport', 20, 2),
    
    -- Revisão de Necessidades (peso 3)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Revisão completa das necessidades e validação de mudanças', 'Necessidades', 30, 3),
    
    -- Apresentação da Proposta (peso 3)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Apresentação clara da proposta com benefícios específicos e ROI', 'Proposta', 30, 4),
    
    -- Tratamento de Objeções (peso 2)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Tratamento efetivo de objeções e manutenção da confiança', 'Objeções', 20, 5),
    
    -- Fechamento e Ação (peso 2)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Fechamento claro com próximos passos definidos', 'Fechamento', 20, 6),
    
    -- Próximos Passos (peso 1)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Próximos passos claros com prazos e responsabilidades', 'Próximos Passos', 10, 7);

-- =========================================
-- VERIFICAÇÃO
-- =========================================

-- Verificar se o scorecard foi criado
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
    sc.text,
    sc.category,
    sc.weight,
    sc.order_index
FROM scorecard_criteria sc
WHERE sc.scorecard_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
ORDER BY sc.order_index;
