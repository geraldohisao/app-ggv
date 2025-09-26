-- 🔧 REMOVER: Notas das ligações com falha na análise
-- Remove notas de ligações que falharam na análise para não impactar médias

-- 1. Verificar ligações com nota mas com falha na análise
SELECT 'Ligações com nota mas com falha na análise:' as info;
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
AND (
    ca.general_feedback ILIKE '%análise automática indisponível%'
    OR ca.general_feedback ILIKE '%resposta do modelo não pôde ser processada%'
    OR ca.general_feedback ILIKE '%erro%'
    OR ca.general_feedback ILIKE '%falha%'
    OR ca.general_feedback ILIKE '%configurar chave%'
    OR ca.general_feedback ILIKE '%modelo de ia%'
    OR ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR ca.improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR ca.improvements::text ILIKE '%Revisar configuração do modelo%'
    OR ca.confidence < 0.5
)
ORDER BY ca.created_at DESC;

-- 2. Remover notas das ligações com falha na análise
UPDATE call_analysis 
SET 
    final_grade = -1,  -- Marcar como erro de análise (não impacta médias)
    general_feedback = 'Análise automática indisponível. Nota removida para não impactar métricas.',
    updated_at = NOW()
WHERE final_grade > 0
AND (
    general_feedback ILIKE '%análise automática indisponível%'
    OR general_feedback ILIKE '%resposta do modelo não pôde ser processada%'
    OR general_feedback ILIKE '%erro%'
    OR general_feedback ILIKE '%falha%'
    OR general_feedback ILIKE '%configurar chave%'
    OR general_feedback ILIKE '%modelo de ia%'
    OR strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR improvements::text ILIKE '%Revisar configuração do modelo%'
    OR confidence < 0.5
);

-- 3. Verificar quantas ligações foram corrigidas
SELECT 'Ligações corrigidas (nota removida):' as info;
SELECT 
    COUNT(*) as total_corrigidas
FROM call_analysis 
WHERE final_grade = -1
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

-- 5. Verificar ligações com final_grade = -1 (análise falhou)
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
ORDER BY ca.created_at DESC
LIMIT 10;

-- 6. Estatísticas finais
SELECT 'Estatísticas finais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade = -1 THEN 1 END) as analises_falharam,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as analises_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as analises_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;
