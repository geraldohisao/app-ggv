-- 🔧 CORRIGIR DUPLICAÇÃO DA ANDRESSA NO RANKING
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar registros da Andressa
SELECT 'Registros atuais da Andressa:' as info;
SELECT 
    agent_id,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN ca.final_grade IS NOT NULL THEN 1 END) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id LIKE '%Andressa%'
GROUP BY c.agent_id
ORDER BY avg_score DESC;

-- 2. Unificar todos os registros para "Andressa Habinoski"
UPDATE calls 
SET agent_id = 'Andressa Habinoski'
WHERE agent_id IN ('Andressa', 'andressa', 'ANDRESSA');

-- 3. Verificar após unificação
SELECT 'Após unificação:' as info;
SELECT 
    agent_id,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN ca.final_grade IS NOT NULL THEN 1 END) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id LIKE '%Andressa%'
GROUP BY c.agent_id
ORDER BY avg_score DESC;

-- 4. Testar função após correção
SELECT 'Função get_sdr_metrics_with_analysis após correção:' as info;
SELECT * FROM get_sdr_metrics_with_analysis(99999) 
WHERE sdr_id LIKE '%Andressa%';