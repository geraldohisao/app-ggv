-- 🔍 IDENTIFICAR: Ligações com nota zero por erro de análise
-- Busca ligações que podem ter sido afetadas por erros de análise

-- 1. Buscar ligações com nota zero (possível erro de análise)
SELECT 'Ligações com nota zero (possível erro):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at,
    ca.updated_at as analysis_updated_at
FROM call_analysis ca
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC;

-- 2. Buscar ligações com nota zero e feedback genérico (indicativo de erro)
SELECT 'Ligações com nota zero e feedback genérico (erro confirmado):' as info;
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
WHERE ca.final_grade = 0
AND (
    ca.general_feedback ILIKE '%análise automática indisponível%'
    OR ca.general_feedback ILIKE '%erro%'
    OR ca.general_feedback ILIKE '%falha%'
    OR ca.general_feedback ILIKE '%configurar chave%'
    OR ca.general_feedback ILIKE '%modelo de ia%'
    OR ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR ca.improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR ca.improvements::text ILIKE '%Revisar configuração do modelo%'
)
ORDER BY ca.created_at DESC;

-- 3. Buscar ligações com nota zero e baixa confiança
SELECT 'Ligações com nota zero e baixa confiança (erro provável):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = 0
AND ca.confidence < 0.5
ORDER BY ca.created_at DESC;

-- 4. Contar total de ligações com nota zero
SELECT 'Estatísticas de ligações com nota zero:' as info;
SELECT 
    COUNT(*) as total_zero_scores,
    COUNT(CASE WHEN ca.general_feedback ILIKE '%análise automática indisponível%' THEN 1 END) as erro_analise,
    COUNT(CASE WHEN ca.confidence < 0.5 THEN 1 END) as baixa_confianca,
    COUNT(CASE WHEN ca.strengths::text ILIKE '%Chamada realizada com sucesso%' THEN 1 END) as feedback_generico
FROM call_analysis ca
WHERE ca.final_grade = 0;

-- 5. Buscar ligações com nota zero por período (últimos 30 dias)
SELECT 'Ligações com nota zero nos últimos 30 dias:' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = 0
AND ca.created_at >= NOW() - INTERVAL '30 days'
ORDER BY ca.created_at DESC;

-- 6. Verificar se há ligações com nota zero que não são erro
SELECT 'Ligações com nota zero que podem ser legítimas:' as info;
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
WHERE ca.final_grade = 0
AND ca.general_feedback NOT ILIKE '%análise automática indisponível%'
AND ca.general_feedback NOT ILIKE '%erro%'
AND ca.general_feedback NOT ILIKE '%falha%'
AND ca.general_feedback NOT ILIKE '%configurar chave%'
AND ca.strengths::text NOT ILIKE '%Chamada realizada com sucesso%'
AND ca.improvements::text NOT ILIKE '%Configurar chave da API Gemini%'
ORDER BY ca.created_at DESC;
