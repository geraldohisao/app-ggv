-- 🔍 VERIFICAR: Estrutura das funções get_sdr_metrics
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar estrutura da função get_sdr_metrics
SELECT 'Estrutura da função get_sdr_metrics:' as info;
SELECT 
    proname,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'get_sdr_metrics';

-- 2. Testar função sem ORDER BY para ver colunas
SELECT 'Testando get_sdr_metrics (primeiros 3):' as info;
SELECT * FROM get_sdr_metrics() LIMIT 3;

-- 3. Testar get_sdr_metrics_with_analysis
SELECT 'Testando get_sdr_metrics_with_analysis (primeiros 3):' as info;
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 3;

-- 4. Verificar definição da função
SELECT 'Definição da função get_sdr_metrics:' as info;
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_sdr_metrics';
