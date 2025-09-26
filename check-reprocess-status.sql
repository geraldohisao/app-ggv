-- Verificar status das 54 ligações marcadas para reprocessamento
-- Execute este script no Supabase para entender por que não aparecem no dashboard

-- 1. Verificar ligações marcadas para reprocessamento
SELECT 
    'Ligações marcadas para reprocessamento' as status,
    COUNT(*) as quantidade
FROM public.call_analysis 
WHERE final_grade = 0 
  AND general_feedback LIKE '%Marcado para reprocessamento%';

-- 2. Verificar se as ligações atendem aos critérios do dashboard
SELECT 
    c.id,
    c.status,
    c.duration,
    c.transcription,
    ca.final_grade,
    ca.general_feedback,
    -- Critérios do dashboard
    CASE 
        WHEN c.status = 'normal_clearing' THEN '✅ Status OK'
        ELSE '❌ Status: ' || c.status
    END as status_check,
    CASE 
        WHEN c.duration >= 180 THEN '✅ Duração OK'
        ELSE '❌ Duração: ' || c.duration || 's'
    END as duration_check,
    CASE 
        WHEN LENGTH(c.transcription) >= 100 THEN '✅ Transcrição OK'
        ELSE '❌ Transcrição: ' || LENGTH(c.transcription) || ' chars'
    END as transcription_check
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Resumo dos critérios
SELECT 
    'Status normal_clearing' as criterio,
    COUNT(*) as quantidade
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
  AND c.status = 'normal_clearing'

UNION ALL

SELECT 
    'Duração >= 180s' as criterio,
    COUNT(*) as quantidade
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
  AND c.duration >= 180

UNION ALL

SELECT 
    'Transcrição >= 100 chars' as criterio,
    COUNT(*) as quantidade
FROM public.call_analysis ca
JOIN public.calls c ON ca.call_id = c.id
WHERE ca.final_grade = 0 
  AND ca.general_feedback LIKE '%Marcado para reprocessamento%'
  AND LENGTH(c.transcription) >= 100;
