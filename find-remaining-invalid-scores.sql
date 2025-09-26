-- 🔍 ENCONTRAR: Ligações com nota mas com falha na análise
-- Encontra ligações que ainda têm nota mas com erro na análise

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

-- 2. Verificar ligações com nota mas com análise não disponível
SELECT 'Ligações com nota mas com análise não disponível:' as info;
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
    ca.general_feedback ILIKE '%análise não disponível%'
    OR ca.general_feedback ILIKE '%análise automática indisponível%'
    OR ca.general_feedback ILIKE '%nota removida para não impactar métricas%'
)
ORDER BY ca.created_at DESC;

-- 3. Verificar ligações com nota mas com baixa confiança
SELECT 'Ligações com nota mas com baixa confiança:' as info;
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
AND ca.confidence < 0.5
ORDER BY ca.created_at DESC;

-- 4. Verificar ligações com nota mas com feedback genérico
SELECT 'Ligações com nota mas com feedback genérico:' as info;
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
    ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR ca.improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR ca.improvements::text ILIKE '%Revisar configuração do modelo%'
)
ORDER BY ca.created_at DESC;

-- 5. Estatísticas atuais
SELECT 'Estatísticas atuais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as analises_falharam,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as analises_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as analises_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;
