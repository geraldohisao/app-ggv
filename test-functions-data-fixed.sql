-- 🔍 TESTE CORRIGIDO: Ver dados das funções SDR Metrics
-- Execute este script no SQL Editor do Supabase

-- 1. Ver dados da get_sdr_metrics
SELECT 'FUNÇÃO get_sdr_metrics - Primeiros 5 registros:' as info;
SELECT * FROM get_sdr_metrics() LIMIT 5;

-- 2. Ver dados da get_sdr_metrics_with_analysis  
SELECT 'FUNÇÃO get_sdr_metrics_with_analysis - Primeiros 5 registros:' as info;
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 5;

-- 3. Dados reais: SDRs com suas notas médias
SELECT 'DADOS REAIS - SDRs com notas médias do banco:' as info;
SELECT 
    c.agent_id as sdr_name,
    COUNT(c.id) as total_calls,
    COUNT(ca.id) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score,
    MIN(ca.final_grade) as min_score,
    MAX(ca.final_grade) as max_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id
HAVING COUNT(ca.id) > 0  -- Apenas SDRs com análises
ORDER BY avg_score DESC NULLS LAST
LIMIT 10;

-- 4. Verificar se existe coluna avg_score nas funções
SELECT 'Testando se get_sdr_metrics tem avg_score:' as info;
SELECT sdr_id FROM get_sdr_metrics() LIMIT 1;

-- 5. Comparação direta: Camila Ataliba
SELECT 'COMPARAÇÃO - Camila Ataliba:' as info;
SELECT 
    'Dados Reais' as fonte,
    COUNT(c.id) as total_calls,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id = 'Camila Ataliba'
UNION ALL
SELECT 
    'Função get_sdr_metrics' as fonte,
    NULL as total_calls,
    NULL as avg_score
-- Vamos ver se a função tem esses dados
