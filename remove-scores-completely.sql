-- 🔧 REMOVER: Notas completamente das ligações com falha na análise
-- Remove notas completamente (NULL) para não afetar médias

-- 1. Verificar ligações com final_grade = -1 (análise falhou)
SELECT 'Ligações com final_grade = -1 (análise falhou):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = -1
ORDER BY ca.created_at DESC;

-- 2. Remover notas completamente (NULL) das ligações com falha na análise
UPDATE call_analysis 
SET 
    final_grade = NULL,  -- Remover nota completamente (não afeta médias)
    general_feedback = 'Análise automática indisponível. Nota removida para não impactar métricas.',
    updated_at = NOW()
WHERE final_grade = -1;

-- 3. Verificar quantas ligações foram corrigidas
SELECT 'Ligações corrigidas (nota removida completamente):' as info;
SELECT 
    COUNT(*) as total_corrigidas
FROM call_analysis 
WHERE final_grade IS NULL
AND updated_at >= NOW() - INTERVAL '1 minute';

-- 4. Verificar ligações que ainda têm nota válida
SELECT 'Ligações que ainda têm nota válida:' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade > 0
ORDER BY ca.created_at DESC
LIMIT 10;

-- 5. Verificar ligações com final_grade = NULL (análise falhou)
SELECT 'Ligações com final_grade = NULL (análise falhou):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade IS NULL
ORDER BY ca.created_at DESC
LIMIT 10;

-- 6. Estatísticas finais
SELECT 'Estatísticas finais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as analises_falharam,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as analises_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as analises_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;
