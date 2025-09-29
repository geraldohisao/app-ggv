-- 🔍 VERIFICAR: Campos de duração
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar tipos de campos de duração
SELECT 'Tipos de campos de duração:' as info;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN ('duration', 'duration_formated', 'duration_formatted')
ORDER BY column_name;

-- 2. Comparar duration vs duration_formated
SELECT 'Comparação duration vs duration_formated:' as info;
SELECT 
    id,
    duration,
    duration_formated,
    -- Converter duration_formated para segundos
    CASE 
        WHEN duration_formated IS NOT NULL THEN
            EXTRACT(EPOCH FROM duration_formated::interval)::INTEGER
        ELSE NULL
    END as duration_from_formatted,
    enterprise,
    status_voip
FROM calls 
WHERE duration >= 100 OR 
      (duration_formated IS NOT NULL AND 
       EXTRACT(EPOCH FROM duration_formated::interval) >= 100)
ORDER BY duration DESC
LIMIT 5;

-- 3. Verificar se há ligações com duration_formated >= 100s
SELECT 'Ligações com duration_formated >= 100s:' as info;
SELECT COUNT(*) as count_formatted_over_100s
FROM calls 
WHERE duration_formated IS NOT NULL 
AND EXTRACT(EPOCH FROM duration_formated::interval) >= 100;

-- 4. Verificar nossa RPC usa qual campo
SELECT 'Verificando qual campo a RPC usa:' as info;
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';
