-- 🔍 VERIFICAR: Função get_calls_with_filters
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a função existe
SELECT 
    'Verificando se a função get_calls_with_filters existe:' as info,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_calls_with_filters' 
AND routine_schema = 'public';

-- 2. Testar a função com parâmetros simples
SELECT 
    'Testando função get_calls_with_filters:' as info;
    
-- Teste básico da função
SELECT * FROM get_calls_with_filters(
    null, -- p_sdr
    null, -- p_status  
    null, -- p_type
    null, -- p_start_date
    null, -- p_end_date
    10,   -- p_limit
    0,    -- p_offset
    'created_at', -- p_sort_by
    null, -- p_min_duration
    null, -- p_max_duration
    null, -- p_min_score
    null  -- p_search_query
) LIMIT 3;

-- 3. Verificar se há dados na tabela calls
SELECT 
    'Verificando dados na tabela calls:' as info,
    COUNT(*) as total_calls
FROM calls;

-- 4. Verificar estrutura da tabela calls
SELECT 
    'Estrutura da tabela calls:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;
