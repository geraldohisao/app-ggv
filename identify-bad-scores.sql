-- Identificar ligações com notas suspeitas (6 ou 8) que precisam ser reprocessadas
-- Execute este script no Supabase para identificar ligações problemáticas

-- 1. Ligações com nota exata 6.0 (suspeita de fallback genérico)
SELECT 
    id,
    call_id,
    user_id,
    final_grade,
    confidence,
    created_at,
    updated_at,
    'Nota suspeita: 6.0 (possível fallback genérico)' as reason
FROM public.scorecard_analyses 
WHERE final_grade = 6.0
ORDER BY created_at DESC;

-- 2. Ligações com nota exata 8.0 (suspeita de fallback genérico)
SELECT 
    id,
    call_id,
    user_id,
    final_grade,
    confidence,
    created_at,
    updated_at,
    'Nota suspeita: 8.0 (possível fallback genérico)' as reason
FROM public.scorecard_analyses 
WHERE final_grade = 8.0
ORDER BY created_at DESC;

-- 3. Ligações com confiança baixa (menor que 0.5)
SELECT 
    id,
    call_id,
    user_id,
    final_grade,
    confidence,
    created_at,
    updated_at,
    'Confiança baixa: ' || confidence as reason
FROM public.scorecard_analyses 
WHERE confidence < 0.5
ORDER BY confidence ASC, created_at DESC;

-- 4. Ligações com análise genérica (contém texto de fallback)
SELECT 
    id,
    call_id,
    user_id,
    final_grade,
    confidence,
    created_at,
    updated_at,
    'Análise genérica detectada' as reason
FROM public.scorecard_analyses 
WHERE general_feedback LIKE '%Análise automática indisponível%'
   OR general_feedback LIKE '%Configuração ausente%'
   OR general_feedback LIKE '%Erro desconhecido%'
ORDER BY created_at DESC;

-- 5. Resumo geral das ligações problemáticas
SELECT 
    'Total de ligações com nota 6.0' as category,
    COUNT(*) as count
FROM public.scorecard_analyses 
WHERE final_grade = 6.0

UNION ALL

SELECT 
    'Total de ligações com nota 8.0' as category,
    COUNT(*) as count
FROM public.scorecard_analyses 
WHERE final_grade = 8.0

UNION ALL

SELECT 
    'Total de ligações com confiança baixa' as category,
    COUNT(*) as count
FROM public.scorecard_analyses 
WHERE confidence < 0.5

UNION ALL

SELECT 
    'Total de ligações com análise genérica' as category,
    COUNT(*) as count
FROM public.scorecard_analyses 
WHERE general_feedback LIKE '%Análise automática indisponível%'
   OR general_feedback LIKE '%Configuração ausente%'
   OR general_feedback LIKE '%Erro desconhecido%';
