-- 🔍 VERIFICAR: Ranking por nota média
-- Execute este script no SQL Editor do Supabase

-- 1. Ranking por nota média (dados reais)
SELECT 'Ranking por nota média - dados reais:' as info;
SELECT 
    c.agent_id,
    COUNT(ca.final_grade) as total_com_nota,
    COUNT(c.id) as total_chamadas,
    ROUND(AVG(ca.final_grade), 1) as nota_media_real,
    ROUND(
        (COUNT(ca.final_grade)::NUMERIC / COUNT(c.id)) * 100, 
        0
    ) as cobertura_percent
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id
HAVING COUNT(ca.final_grade) > 0
ORDER BY nota_media_real DESC;

-- 2. Verificar notas específicas dos SDRs mostrados na interface
SELECT 'Verificação específica das notas:' as info;

-- Camila Ataliba (interface mostra 7.1)
SELECT 
    'Camila Ataliba' as sdr,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score_real,
    '7.1' as interface_shows,
    CASE 
        WHEN ROUND(AVG(ca.final_grade), 1) = 7.1 THEN '✅ CORRETO'
        ELSE '❌ DIFERENTE'
    END as status
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Camila Ataliba'

UNION ALL

-- Mariana Costa (interface mostra 7.0)
SELECT 
    'Mariana Costa' as sdr,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score_real,
    '7.0' as interface_shows,
    CASE 
        WHEN ROUND(AVG(ca.final_grade), 1) = 7.0 THEN '✅ CORRETO'
        ELSE '❌ DIFERENTE'
    END as status
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Mariana Costa'

UNION ALL

-- Barbara Rabech (interface mostra 6.9)
SELECT 
    'Barbara Rabech' as sdr,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score_real,
    '6.9' as interface_shows,
    CASE 
        WHEN ROUND(AVG(ca.final_grade), 1) = 6.9 THEN '✅ CORRETO'
        ELSE '❌ DIFERENTE'
    END as status
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Barbara Rabech';

-- 3. Verificar função get_sdr_metrics se existir
SELECT 'Verificando se existe função get_sdr_metrics:' as info;
SELECT proname FROM pg_proc WHERE proname LIKE '%sdr%metric%' OR proname LIKE '%ranking%';
