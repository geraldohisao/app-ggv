-- 🔧 CORRIGIR: Critério "Validou o tomador de decisão"
-- Este script corrige o critério para ser mais específico

-- 1. Verificar scorecards ativos
SELECT 'Scorecards ativos:' as info;
SELECT 
    s.id,
    s.name,
    s.description,
    s.active,
    s.target_call_types,
    s.target_pipelines,
    s.target_cadences
FROM scorecards s
WHERE s.active = true
ORDER BY s.name;

-- 2. Atualizar critério "Validou o tomador de decisão" para ser mais específico
-- Nota: Este é um exemplo de como corrigir, você precisará ajustar no frontend
-- O critério deve ser mais específico sobre O QUE constitui "validar o tomador de decisão"

-- 3. Sugestões de critérios mais específicos:
-- "Identificou quem é o tomador de decisão" (nome, cargo, responsabilidade)
-- "Confirmou que a pessoa tem autoridade para decidir" (orçamento, aprovação)
-- "Validou o processo de decisão" (quem mais participa, prazos, critérios)

-- 4. Verificar ligações com nota alta para entender o problema
SELECT 'Ligações com nota alta (possível problema):' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.agent_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade >= 8
ORDER BY ca.final_grade DESC
LIMIT 5;
