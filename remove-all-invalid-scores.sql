-- 🔧 REMOVER: Todas as notas inválidas
-- Remove notas de TODAS as ligações sem análise ou com falha

-- 1. Verificar ligações com nota mas sem análise ou com falha
SELECT 'Ligações com nota mas sem análise ou com falha:' as info;
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
    OR ca.general_feedback ILIKE '%análise não disponível%'
    OR ca.general_feedback ILIKE '%erro%'
    OR ca.general_feedback ILIKE '%falha%'
    OR ca.general_feedback ILIKE '%configurar chave%'
    OR ca.general_feedback ILIKE '%modelo de ia%'
    OR ca.general_feedback ILIKE '%nota removida para não impactar métricas%'
    OR ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR ca.improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR ca.improvements::text ILIKE '%Revisar configuração do modelo%'
    OR ca.confidence < 0.5
)
ORDER BY ca.created_at DESC;

-- 2. Remover TODAS as notas de ligações sem análise ou com falha
UPDATE call_analysis 
SET 
    final_grade = NULL,  -- Remover nota completamente (não afeta médias)
    general_feedback = 'Análise automática indisponível. Nota removida para não impactar métricas.',
    updated_at = NOW()
WHERE final_grade > 0
AND (
    general_feedback ILIKE '%análise automática indisponível%'
    OR general_feedback ILIKE '%resposta do modelo não pôde ser processada%'
    OR general_feedback ILIKE '%análise não disponível%'
    OR general_feedback ILIKE '%erro%'
    OR general_feedback ILIKE '%falha%'
    OR general_feedback ILIKE '%configurar chave%'
    OR general_feedback ILIKE '%modelo de ia%'
    OR general_feedback ILIKE '%nota removida para não impactar métricas%'
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
WHERE final_grade IS NULL
AND updated_at >= NOW() - INTERVAL '1 minute';

-- 4. Verificar ligações que ainda têm nota válida (apenas as legítimas)
SELECT 'Ligações que ainda têm nota válida (apenas legítimas):' as info;
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

-- 5. Verificar ligações sem nota (análise falhou ou sem análise)
SELECT 'Ligações sem nota (análise falhou ou sem análise):' as info;
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
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as analises_sem_nota,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as analises_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as analises_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;
