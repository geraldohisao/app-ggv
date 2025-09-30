-- 🔍 TESTE SIMPLES: Funções SDR Metrics
-- Execute este script no SQL Editor do Supabase

-- 1. Testar get_sdr_metrics sem ORDER BY
SELECT 'Dados da função get_sdr_metrics:' as info;
SELECT * FROM get_sdr_metrics() LIMIT 3;

-- 2. Testar get_sdr_metrics_with_analysis
SELECT 'Dados da função get_sdr_metrics_with_analysis:' as info;
SELECT * FROM get_sdr_metrics_with_analysis() LIMIT 3;

-- 3. Verificar se há coluna de nota
SELECT 'Procurando colunas com "score" ou "nota":' as info;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'calls' 
AND column_name ILIKE '%score%'
UNION
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'call_analysis' 
AND column_name ILIKE '%score%'
UNION
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'call_analysis' 
AND column_name ILIKE '%grade%';
