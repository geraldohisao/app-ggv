-- 🔍 TESTAR: Funções de métricas SDR
-- Execute este script no SQL Editor do Supabase

-- 1. Testar get_sdr_metrics
SELECT 'Testando get_sdr_metrics:' as info;
SELECT * FROM get_sdr_metrics() ORDER BY avg_score DESC LIMIT 5;

-- 2. Testar get_sdr_metrics_with_analysis
SELECT 'Testando get_sdr_metrics_with_analysis:' as info;
SELECT * FROM get_sdr_metrics_with_analysis() ORDER BY avg_score DESC LIMIT 5;

-- 3. Testar get_sdr_metrics_cache_test
SELECT 'Testando get_sdr_metrics_cache_test:' as info;
SELECT * FROM get_sdr_metrics_cache_test() ORDER BY avg_score DESC LIMIT 5;

-- 4. Comparar com dados da interface
SELECT 'Comparação com interface:' as info;
SELECT 
    'Camila Ataliba' as sdr_interface,
    '7.1' as nota_interface,
    (SELECT ROUND(AVG(ca.final_grade), 1) 
     FROM calls c 
     JOIN call_analysis ca ON ca.call_id = c.id 
     WHERE c.agent_id = 'Camila Ataliba' 
     AND ca.final_grade IS NOT NULL) as nota_real_banco
UNION ALL
SELECT 
    'Mariana Costa' as sdr_interface,
    '7.0' as nota_interface,
    (SELECT ROUND(AVG(ca.final_grade), 1) 
     FROM calls c 
     JOIN call_analysis ca ON ca.call_id = c.id 
     WHERE c.agent_id = 'Mariana Costa' 
     AND ca.final_grade IS NOT NULL) as nota_real_banco
UNION ALL
SELECT 
    'Barbara Rabech' as sdr_interface,
    '6.9' as nota_interface,
    (SELECT ROUND(AVG(ca.final_grade), 1) 
     FROM calls c 
     JOIN call_analysis ca ON ca.call_id = c.id 
     WHERE c.agent_id = 'Barbara Rabech' 
     AND ca.final_grade IS NOT NULL) as nota_real_banco;
