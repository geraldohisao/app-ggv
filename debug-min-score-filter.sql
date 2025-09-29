-- 🔍 DEBUG: Filtro de Nota Mínima
-- Este script investiga por que o filtro de nota mínima não está funcionando

-- 1. Verificar se a função get_calls_with_filters existe
SELECT '1. Verificando função get_calls_with_filters:' as info;
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Testar a função com filtro de nota mínima 8
SELECT '2. Testando função com min_score = 8:' as info;
SELECT 
    id,
    enterprise,
    person,
    agent_id,
    call_type,
    duration,
    created_at
FROM get_calls_with_filters(
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
    8.0   -- p_min_score
);

-- 3. Verificar ligações com nota >= 8 diretamente
SELECT '3. Ligações com nota >= 8 (direto da tabela):' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    ca.final_grade as score,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade >= 8
ORDER BY ca.final_grade DESC
LIMIT 10;

-- 4. Verificar se há problema na função get_calls_with_filters
SELECT '4. Verificando estrutura da função:' as info;
SELECT 
    p.proname,
    p.proargnames,
    p.proargtypes,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'get_calls_with_filters';
