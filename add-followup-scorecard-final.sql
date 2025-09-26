-- add-followup-scorecard-final.sql
-- Script final para adicionar scorecard follow up
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- PRIMEIRO: VERIFICAR ESTRUTURA DAS TABELAS
-- =========================================

-- Verificar se as tabelas existem e suas colunas
DO $$
DECLARE
    scorecards_exists boolean;
    criteria_exists boolean;
    scorecards_columns text[];
    criteria_columns text[];
BEGIN
    -- Verificar se scorecards existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scorecards'
    ) INTO scorecards_exists;
    
    -- Verificar se scorecard_criteria existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scorecard_criteria'
    ) INTO criteria_exists;
    
    IF NOT scorecards_exists THEN
        RAISE EXCEPTION 'Tabela scorecards não existe. Execute primeiro fix-scorecard-tables.sql';
    END IF;
    
    IF NOT criteria_exists THEN
        RAISE EXCEPTION 'Tabela scorecard_criteria não existe. Execute primeiro fix-scorecard-tables.sql';
    END IF;
    
    -- Verificar colunas da tabela scorecards
    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO scorecards_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scorecards';
    
    -- Verificar colunas da tabela scorecard_criteria
    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO criteria_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scorecard_criteria';
    
    RAISE NOTICE 'Colunas scorecards: %', array_to_string(scorecards_columns, ', ');
    RAISE NOTICE 'Colunas scorecard_criteria: %', array_to_string(criteria_columns, ', ');
    
END $$;

-- =========================================
-- INSERIR SCORECARD FOLLOW UP
-- =========================================

-- Inserir scorecard (usando apenas colunas que existem)
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
-- INSERIR CRITÉRIOS (usando estrutura correta)
-- =========================================

-- Limpar critérios existentes para este scorecard
DELETE FROM scorecard_criteria 
WHERE scorecard_id = '550e8400-e29b-41d4-a716-446655440001'::UUID;

-- Inserir novos critérios (usando estrutura correta: name, description, weight, max_score)
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
VALUES 
    -- Abertura Follow Up (peso 1)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Abertura Follow Up', 'Abertura calorosa com referência à conversa anterior', 10, 3, 1),
    
    -- Reconexão e Rapport (peso 2) 
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Reconexão e Rapport', 'Reconexão efetiva e estabelecimento de rapport', 20, 3, 2),
    
    -- Revisão de Necessidades (peso 3)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Revisão de Necessidades', 'Revisão completa das necessidades e validação de mudanças', 30, 3, 3),
    
    -- Apresentação da Proposta (peso 3)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Apresentação da Proposta', 'Apresentação clara da proposta com benefícios específicos e ROI', 30, 3, 4),
    
    -- Tratamento de Objeções (peso 2)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Tratamento de Objeções', 'Tratamento efetivo de objeções e manutenção da confiança', 20, 3, 5),
    
    -- Fechamento e Ação (peso 2)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Fechamento e Ação', 'Fechamento claro com próximos passos definidos', 20, 3, 6),
    
    -- Próximos Passos (peso 1)
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Próximos Passos', 'Próximos passos claros com prazos e responsabilidades', 10, 3, 7);

-- =========================================
-- VERIFICAÇÃO FINAL
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
    sc.name,
    sc.description,
    sc.weight,
    sc.max_score,
    sc.order_index
FROM scorecard_criteria sc
WHERE sc.scorecard_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
ORDER BY sc.order_index;
