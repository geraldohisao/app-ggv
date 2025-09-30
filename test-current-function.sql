-- 🔍 TESTAR FUNÇÃO ATUAL - Execute no SQL Editor (uma linha por vez)

-- Teste 1: Ver se a função existe
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_sdr_metrics_with_analysis';

-- Teste 2: Executar função atual
SELECT * FROM get_sdr_metrics_with_analysis(99999) LIMIT 3;

-- Teste 3: Ver dados reais para comparar
SELECT 
    c.agent_id as sdr_name,
    COUNT(ca.id) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id IN ('Camila Ataliba', 'Mariana Costa', 'Andressa')
GROUP BY c.agent_id
ORDER BY avg_score DESC;
