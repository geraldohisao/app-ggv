-- ===================================================================
-- IMPROVE DURATION DISPLAY - Melhorar exibição da duração média
-- ===================================================================

-- 1. Testar função atual para ver duração
SELECT 
    '=== TESTANDO DURAÇÃO ATUAL ===' as teste;

SELECT 
    sdr_name,
    total_calls,
    ROUND(avg_duration, 0) as avg_duration_seconds,
    ROUND(avg_duration/60, 1) as avg_duration_minutes,
    CASE 
        WHEN avg_duration >= 3600 THEN 
            FLOOR(avg_duration/3600) || 'h ' || FLOOR((avg_duration % 3600)/60) || 'm'
        WHEN avg_duration >= 60 THEN 
            FLOOR(avg_duration/60) || 'm ' || ROUND(avg_duration % 60) || 's'
        ELSE 
            ROUND(avg_duration) || 's'
    END as duration_formatted
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 5;

-- 2. Verificar se filtros de período funcionam
SELECT 
    '=== TESTANDO FILTROS DE PERÍODO ===' as teste_filtros;

-- Últimos 7 dias
SELECT 
    'ÚLTIMOS 7 DIAS' as periodo,
    COUNT(*) as total_sdrs,
    SUM(total_calls) as total_chamadas
FROM public.get_sdr_metrics(7);

-- Últimos 15 dias  
SELECT 
    'ÚLTIMOS 15 DIAS' as periodo,
    COUNT(*) as total_sdrs,
    SUM(total_calls) as total_chamadas
FROM public.get_sdr_metrics(15);

-- Últimos 30 dias (padrão)
SELECT 
    'ÚLTIMOS 30 DIAS' as periodo,
    COUNT(*) as total_sdrs,
    SUM(total_calls) as total_chamadas
FROM public.get_sdr_metrics(30);

-- 3. Verificar dados de duração detalhados
SELECT 
    '=== ANÁLISE DETALHADA DE DURAÇÃO ===' as analise;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    ROUND(avg_duration, 0) as avg_duration_seconds,
    CASE 
        WHEN avg_duration < 60 THEN ROUND(avg_duration) || 's'
        WHEN avg_duration < 3600 THEN FLOOR(avg_duration/60) || 'm ' || ROUND(avg_duration % 60) || 's'
        ELSE FLOOR(avg_duration/3600) || 'h ' || FLOOR((avg_duration % 3600)/60) || 'm'
    END as duration_display,
    ROUND((answered_calls::NUMERIC / total_calls) * 100, 1) as answer_rate_percent
FROM public.get_sdr_metrics(30)
WHERE total_calls >= 5  -- Só SDRs com pelo menos 5 chamadas
ORDER BY total_calls DESC;

SELECT 'Análise de duração e filtros concluída!' as status;
