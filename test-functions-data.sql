-- 🔍 TESTE: Ver dados das funções SDR Metrics
-- Execute este script no SQL Editor do Supabase

-- 1. Ver estrutura completa da get_sdr_metrics
SELECT 'FUNÇÃO get_sdr_metrics - Primeiros 3 registros:' as info;
SELECT * FROM get_sdr_metrics() LIMIT 3;

-- 2. Ver estrutura completa da get_sdr_metrics_with_analysis  
SELECT 'FUNÇÃO get_sdr_metrics_with_analysis - Primeiros 3 registros:' as info;
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 3;

-- 3. Verificar se as funções têm colunas de score
SELECT 'COLUNAS das funções SDR:' as info;

-- Verificar definição da get_sdr_metrics
SELECT 
    routine_name,
    data_type,
    ordinal_position,
    parameter_name
FROM information_schema.parameters 
WHERE routine_name IN ('get_sdr_metrics', 'get_sdr_metrics_with_analysis')
AND routine_schema = 'public'
ORDER BY routine_name, ordinal_position;

-- 4. Teste direto: buscar SDRs com suas notas médias
SELECT 'DADOS REAIS - SDRs com notas médias:' as info;
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
