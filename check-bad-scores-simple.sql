-- Script simples para identificar ligações com notas suspeitas
-- Execute este script no Supabase SQL Editor

-- 1. Ligações com nota 6.0 (suspeita)
SELECT 
    'Nota 6.0' as tipo,
    COUNT(*) as quantidade,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM public.call_analysis 
WHERE final_grade = 6.0

UNION ALL

-- 2. Ligações com nota 8.0 (suspeita)
SELECT 
    'Nota 8.0' as tipo,
    COUNT(*) as quantidade,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM public.call_analysis 
WHERE final_grade = 8.0

UNION ALL

-- 3. Ligações com confiança baixa
SELECT 
    'Confiança baixa' as tipo,
    COUNT(*) as quantidade,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM public.call_analysis 
WHERE confidence < 0.5

UNION ALL

-- 4. Ligações com análise genérica
SELECT 
    'Análise genérica' as tipo,
    COUNT(*) as quantidade,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM public.call_analysis 
WHERE general_feedback LIKE '%Análise automática indisponível%'
   OR general_feedback LIKE '%Configuração ausente%'
   OR general_feedback LIKE '%Erro desconhecido%';
