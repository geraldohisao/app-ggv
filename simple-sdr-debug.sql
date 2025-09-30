-- 🔍 DEBUG SIMPLES: Funções SDR (Execute no SQL Editor do Supabase)

-- 1. Testar get_sdr_metrics
SELECT * FROM get_sdr_metrics() LIMIT 2;

-- 2. Testar get_sdr_metrics_with_analysis  
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 2;

-- 3. Listar funções SDR disponíveis
SELECT 
    routine_name as function_name
FROM information_schema.routines 
WHERE routine_name LIKE 'get_sdr%' 
AND routine_schema = 'public'
ORDER BY routine_name;

-- 4. Dados reais para comparação
SELECT 
    c.agent_id as sdr_name,
    COUNT(c.id) as total_calls,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id IN ('Camila Ataliba', 'Mariana Costa', 'Andressa')
GROUP BY c.agent_id
HAVING COUNT(ca.id) > 0
ORDER BY avg_score DESC;
