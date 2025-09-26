-- Reprocessar ligações com notas suspeitas
-- Execute este script no Supabase para marcar ligações para reprocessamento

-- 1. Marcar ligações com nota 6.0 para reprocessamento
UPDATE public.call_analysis 
SET 
    final_grade = NULL,
    confidence = 0,
    general_feedback = 'Marcado para reprocessamento - nota suspeita (6.0)',
    updated_at = NOW()
WHERE final_grade = 6.0;

-- 2. Marcar ligações com nota 8.0 para reprocessamento
UPDATE public.call_analysis 
SET 
    final_grade = NULL,
    confidence = 0,
    general_feedback = 'Marcado para reprocessamento - nota suspeita (8.0)',
    updated_at = NOW()
WHERE final_grade = 8.0;

-- 3. Marcar ligações com confiança baixa para reprocessamento
UPDATE public.call_analysis 
SET 
    final_grade = NULL,
    confidence = 0,
    general_feedback = 'Marcado para reprocessamento - confiança baixa',
    updated_at = NOW()
WHERE confidence < 0.5;

-- 4. Marcar ligações com análise genérica para reprocessamento
UPDATE public.call_analysis 
SET 
    final_grade = NULL,
    confidence = 0,
    general_feedback = 'Marcado para reprocessamento - análise genérica',
    updated_at = NOW()
WHERE general_feedback LIKE '%Análise automática indisponível%'
   OR general_feedback LIKE '%Configuração ausente%'
   OR general_feedback LIKE '%Erro desconhecido%';

-- 5. Verificar quantas ligações foram marcadas para reprocessamento
SELECT 
    'Ligações marcadas para reprocessamento' as status,
    COUNT(*) as count
FROM public.call_analysis 
WHERE final_grade IS NULL 
  AND general_feedback LIKE '%Marcado para reprocessamento%';
