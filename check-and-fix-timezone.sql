-- VERIFICAR O PROBLEMA DE TIMEZONE/DATA
SELECT 
    NOW() as now_function,
    CURRENT_TIMESTAMP as current_timestamp,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as now_brazil,
    NOW() AT TIME ZONE 'UTC' as now_utc,
    '2024-12-17'::timestamp as expected_date;

-- VERIFICAR SE AS CHAMADAS ESTÃO NO PERÍODO CORRETO
-- Usando uma data fixa ao invés de NOW()
WITH date_ref AS (
    SELECT '2024-12-17'::timestamp as today
)
SELECT 
    COUNT(*) as total_calls,
    TO_CHAR(MIN(created_at), 'DD/MM/YYYY HH24:MI') as primeira_call,
    TO_CHAR(MAX(created_at), 'DD/MM/YYYY HH24:MI') as ultima_call,
    COUNT(*) FILTER (WHERE c.created_at >= d.today - INTERVAL '14 days') as ultimos_14_dias_correto,
    COUNT(*) FILTER (WHERE c.created_at >= d.today - INTERVAL '7 days') as ultimos_7_dias_correto,
    TO_CHAR(d.today, 'DD/MM/YYYY') as data_referencia
FROM calls c, date_ref d
GROUP BY d.today;

-- ALTERNATIVA: Contar chamadas em dezembro/2024
SELECT 
    COUNT(*) as chamadas_dezembro_2024,
    COUNT(*) FILTER (WHERE created_at >= '2024-12-03') as apos_3_dezembro,
    COUNT(*) FILTER (WHERE created_at >= '2024-12-10') as apos_10_dezembro,
    COUNT(*) FILTER (WHERE created_at BETWEEN '2024-12-01' AND '2024-12-31') as todo_dezembro
FROM calls;

