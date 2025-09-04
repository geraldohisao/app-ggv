-- Testar função get_calls_with_filters
SELECT 
    COUNT(*) as total_calls,
    MAX(duration) as max_duration,
    MIN(duration) as min_duration,
    AVG(duration) as avg_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);
