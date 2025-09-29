-- 🧪 TESTAR: Função get_calls_with_filters com min_score
-- Este script testa se a função está funcionando corretamente

-- 1. Testar função sem filtro de nota
SELECT '1. Testando função SEM filtro de nota:' as info;
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
    5,    -- p_limit
    0,    -- p_offset
    'created_at', -- p_sort_by
    null, -- p_min_duration
    null, -- p_max_duration
    null  -- p_min_score (SEM filtro)
);

-- 2. Testar função COM filtro de nota mínima 8
SELECT '2. Testando função COM filtro min_score = 8:' as info;
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
    5,    -- p_limit
    0,    -- p_offset
    'created_at', -- p_sort_by
    null, -- p_min_duration
    null, -- p_max_duration
    8.0   -- p_min_score (COM filtro)
);

-- 3. Verificar se há diferença nos resultados
SELECT '3. Comparação de resultados:' as info;
SELECT 
    'Sem filtro' as tipo,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 100, 0, 'created_at', null, null, null
)
UNION ALL
SELECT 
    'Com filtro min_score=8' as tipo,
    COUNT(*) as total_registros
FROM get_calls_with_filters(
    null, null, null, null, null, 100, 0, 'created_at', null, null, 8.0
);
