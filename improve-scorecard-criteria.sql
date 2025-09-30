-- 🔧 MELHORAR: Critérios de Scorecard
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar critérios atuais
SELECT 'Critérios atuais dos scorecards:' as info;
SELECT 
    s.name as scorecard_name,
    sc.name as criterion_name,
    sc.description,
    sc.weight,
    sc.max_score
FROM scorecards s
JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.active = true
ORDER BY s.name, sc.order_index;

-- 2. Melhorar critérios do "Ligação - Consultoria"
UPDATE scorecard_criteria
SET 
    description = CASE 
        WHEN name = 'Apresentação pessoal' THEN 
            'SDR se apresentou de forma clara, mencionando nome, empresa (GGV) e objetivo da ligação. Avalie naturalidade e profissionalismo.'
        WHEN name = 'Descoberta de necessidades' THEN 
            'SDR fez perguntas abertas para identificar dores, desafios e necessidades do prospect. Avalie qualidade das perguntas e profundidade da descoberta.'
        WHEN name = 'Qualificação do lead' THEN 
            'SDR verificou fit do prospect: porte da empresa, orçamento, autoridade de decisão e timing. Avalie se coletou informações qualificadoras.'
        WHEN name = 'Apresentação de valor' THEN 
            'SDR conectou soluções da GGV às necessidades identificadas. Avalie se foi personalizado e relevante para o prospect.'
        WHEN name = 'Tratamento de objeções' THEN 
            'SDR identificou e respondeu adequadamente às objeções ou preocupações. Avalie técnica e efetividade das respostas.'
        WHEN name = 'Criação de urgência' THEN 
            'SDR criou senso de urgência ou escassez relevante. Avalie se foi natural e não forçado.'
        WHEN name = 'Fechamento/Next Steps' THEN 
            'SDR definiu próximos passos claros (reunião, demo, proposta). Avalie se conseguiu compromisso concreto do prospect.'
        WHEN name = 'Condução da ligação' THEN 
            'SDR manteve controle da conversa, gerenciou tempo e direcionou para objetivos. Avalie liderança e fluidez.'
        ELSE description
    END
WHERE scorecard_id IN (
    SELECT id FROM scorecards WHERE name = 'Ligação - Consultoria' AND active = true
);

-- 3. Melhorar critérios do "Scorecard Follow Up"
UPDATE scorecard_criteria
SET 
    description = CASE 
        WHEN name ILIKE '%seguimento%' OR name ILIKE '%follow%' THEN 
            'SDR fez seguimento adequado de compromissos anteriores, verificou status de decisões pendentes e manteve relacionamento ativo.'
        WHEN name ILIKE '%próximos passos%' OR name ILIKE '%next%' THEN 
            'SDR definiu e confirmou próximos passos específicos com datas e responsáveis. Avalie clareza e viabilidade.'
        WHEN name ILIKE '%relacionamento%' THEN 
            'SDR demonstrou conhecimento do histórico do cliente e manteve tom adequado ao estágio do relacionamento.'
        ELSE description
    END
WHERE scorecard_id IN (
    SELECT id FROM scorecards WHERE name = 'Scorecard Follow Up' AND active = true
);

-- 4. Verificar critérios após melhoria
SELECT 'Critérios após melhoria:' as info;
SELECT 
    s.name as scorecard_name,
    sc.name as criterion_name,
    sc.description,
    sc.weight,
    sc.max_score
FROM scorecards s
JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.active = true
ORDER BY s.name, sc.order_index;
