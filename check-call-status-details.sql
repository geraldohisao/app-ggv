-- Verificar status detalhado das ligações marcadas para reprocessamento
-- Execute este script no Supabase para entender melhor o problema

-- 1. Ver status das ligações marcadas para reprocessamento
SELECT 
    c.id,
    c.status,
    c.duration,
    c.call_type,
    c.direction,
    LENGTH(c.transcription) as transcription_length,
    ca.final_grade,
    ca.general_feedback,
    c.created_at
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Resumo por status
SELECT 
    c.status,
    COUNT(*) as quantidade
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
GROUP BY c.status
ORDER BY quantidade DESC;

-- 3. Resumo por duração
SELECT 
    CASE 
        WHEN c.duration < 60 THEN '< 1 minuto'
        WHEN c.duration < 180 THEN '1-3 minutos'
        WHEN c.duration < 300 THEN '3-5 minutos'
        ELSE '> 5 minutos'
    END as duracao_categoria,
    COUNT(*) as quantidade
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
GROUP BY 
    CASE 
        WHEN c.duration < 60 THEN '< 1 minuto'
        WHEN c.duration < 180 THEN '1-3 minutos'
        WHEN c.duration < 300 THEN '3-5 minutos'
        ELSE '> 5 minutos'
    END
ORDER BY quantidade DESC;
