-- Identificar ligações que precisam ser reprocessadas
-- Execute este script no Supabase para ver ligações marcadas para reprocessamento

-- 1. Ligações marcadas para reprocessamento
SELECT 
    call_id,
    final_grade,
    confidence,
    general_feedback,
    created_at,
    updated_at
FROM public.call_analysis 
WHERE final_grade = -1 
  AND general_feedback LIKE '%Marcado para reprocessamento%'
ORDER BY updated_at DESC;

-- 2. Resumo por motivo
SELECT 
    general_feedback as motivo,
    COUNT(*) as quantidade,
    MIN(created_at) as mais_antiga,
    MAX(updated_at) as mais_recente
FROM public.call_analysis 
WHERE final_grade = -1 
  AND general_feedback LIKE '%Marcado para reprocessamento%'
GROUP BY general_feedback
ORDER BY quantidade DESC;

-- 3. Total de ligações que precisam ser reprocessadas
SELECT 
    'Total de ligações para reprocessar' as status,
    COUNT(*) as quantidade
FROM public.call_analysis 
WHERE final_grade = -1 
  AND general_feedback LIKE '%Marcado para reprocessamento%';
