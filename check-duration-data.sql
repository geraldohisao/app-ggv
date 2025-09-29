-- 🔍 VERIFICAR: Dados de duração
-- Execute este script no SQL Editor do Supabase

-- 1. Estatísticas de duração
SELECT 'Estatísticas de duração:' as info;
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration >= 100 THEN 1 END) as calls_over_100s,
    COUNT(CASE WHEN duration >= 60 THEN 1 END) as calls_over_60s,
    COUNT(CASE WHEN duration >= 30 THEN 1 END) as calls_over_30s,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration
FROM calls;

-- 2. Exemplos de ligações com duração >= 100s
SELECT 'Ligações >= 100s:' as info;
SELECT 
    id,
    enterprise,
    person,
    duration,
    duration_formated,
    status_voip,
    created_at
FROM calls 
WHERE duration >= 100
ORDER BY created_at DESC
LIMIT 5;

-- 3. Testar filtro direto na tabela
SELECT 'Filtro direto na tabela >= 100s:' as info;
SELECT COUNT(*) as direct_filter_count
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration >= 100;
