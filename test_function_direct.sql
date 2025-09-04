-- Testar função diretamente
SELECT 
    COUNT(*) as total,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);
