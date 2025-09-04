-- Testar função com filtro de SDR específico
SELECT 
    COUNT(*) as total_lô_ruama
FROM public.get_calls_with_filters('Lô-Ruama', NULL, NULL, NULL, NULL, 1000, 0);

-- Testar função com filtro de Andressa
SELECT 
    COUNT(*) as total_andressa  
FROM public.get_calls_with_filters('Andressa', NULL, NULL, NULL, NULL, 1000, 0);

-- Testar função SEM filtro de SDR (deve incluir todas)
SELECT 
    COUNT(*) as total_sem_filtro,
    MAX(duration) as max_duration_sem_filtro
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);
