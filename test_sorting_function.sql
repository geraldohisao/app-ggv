-- Testar se a função com ordenação está funcionando
SELECT 
    'TESTE ORDENAÇÃO DURAÇÃO' as teste,
    id,
    duration,
    sdr_name,
    deal_id
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0, 'duration')
LIMIT 5;

-- Testar função sem parâmetro de ordenação (versão antiga)
SELECT 
    'TESTE SEM ORDENAÇÃO' as teste,
    id,
    duration,
    sdr_name,
    deal_id
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0)
LIMIT 5;
