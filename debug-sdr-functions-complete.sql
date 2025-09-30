-- 🔍 DEBUG COMPLETO: Ver todas as colunas das funções SDR
-- Execute este script no SQL Editor do Supabase

-- 1. Ver TODAS as colunas da get_sdr_metrics
SELECT 'TODAS AS COLUNAS da get_sdr_metrics:' as info;
SELECT * FROM get_sdr_metrics() LIMIT 3;

-- 2. Ver TODAS as colunas da get_sdr_metrics_with_analysis
SELECT 'TODAS AS COLUNAS da get_sdr_metrics_with_analysis:' as info;
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 3;

-- 3. Comparar com dados reais - TOP 5 SDRs
SELECT 'TOP 5 SDRs - DADOS REAIS DO BANCO:' as info;
SELECT 
    c.agent_id as sdr_name,
    COUNT(c.id) as total_calls,
    COUNT(ca.id) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id
HAVING COUNT(ca.id) > 0
ORDER BY avg_score DESC NULLS LAST
LIMIT 5;

-- 4. Verificar se existe função get_sdr_metrics_cache_test
SELECT 'Testando get_sdr_metrics_cache_test:' as info;
SELECT * FROM get_sdr_metrics_cache_test() LIMIT 3;

-- 5. Listar TODAS as funções que começam com get_sdr
SELECT 'TODAS AS FUNÇÕES get_sdr*:' as info;
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE 'get_sdr%' 
AND routine_schema = 'public'
ORDER BY routine_name;
