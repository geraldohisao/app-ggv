-- 🔍 VERIFICAR: Notas das Ligações
-- Script simples para verificar por que não há ligações com nota >= 8

-- 1. Verificar ligações com análise
SELECT 'Ligações com análise:' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    ca.final_grade,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.created_at >= '2025-09-26'
ORDER BY ca.final_grade DESC
LIMIT 10;

-- 2. Contar ligações por faixa de nota
SELECT 'Contagem por faixa de nota:' as info;
SELECT 
    CASE 
        WHEN ca.final_grade >= 8 THEN '8 ou mais'
        WHEN ca.final_grade >= 6 THEN '6 a 8'
        WHEN ca.final_grade >= 4 THEN '4 a 6'
        WHEN ca.final_grade >= 0 THEN '0 a 4'
        ELSE 'Sem nota'
    END as faixa_nota,
    COUNT(*) as quantidade
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.created_at >= '2025-09-26'
GROUP BY 
    CASE 
        WHEN ca.final_grade >= 8 THEN '8 ou mais'
        WHEN ca.final_grade >= 6 THEN '6 a 8'
        WHEN ca.final_grade >= 4 THEN '4 a 6'
        WHEN ca.final_grade >= 0 THEN '0 a 4'
        ELSE 'Sem nota'
    END
ORDER BY quantidade DESC;
