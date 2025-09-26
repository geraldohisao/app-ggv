-- 🧪 TESTAR: Lógica de falha de análise
-- Verifica se a lógica de não atribuir nota zero está funcionando

-- 1. Verificar ligações com final_grade = null (análise falhou)
SELECT 'Ligações com final_grade = null (análise falhou):' as info;
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

-- 2. Verificar ligações com final_grade = 0 (análise com nota zero)
SELECT 'Ligações com final_grade = 0 (análise com nota zero):' as info;
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
ORDER BY ca.created_at DESC
LIMIT 10;

-- 3. Verificar ligações com final_grade > 0 (análise com nota válida)
SELECT 'Ligações com final_grade > 0 (análise com nota válida):' as info;
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

-- 4. Verificar ligações com feedback de erro
SELECT 'Ligações com feedback de erro:' as info;
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
WHERE ca.general_feedback ILIKE '%análise automática indisponível%'
OR ca.general_feedback ILIKE '%erro%'
OR ca.general_feedback ILIKE '%falha%'
OR ca.general_feedback ILIKE '%configurar chave%'
OR ca.general_feedback ILIKE '%modelo de ia%'
ORDER BY ca.created_at DESC
LIMIT 10;

-- 5. Verificar ligações com feedback genérico
SELECT 'Ligações com feedback genérico:' as info;
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
WHERE ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
OR ca.improvements::text ILIKE '%Configurar chave da API Gemini%'
OR ca.improvements::text ILIKE '%Revisar configuração do modelo%'
ORDER BY ca.created_at DESC
LIMIT 10;

-- 6. Verificar ligações com baixa confiança
SELECT 'Ligações com baixa confiança:' as info;
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
WHERE ca.confidence < 0.5
ORDER BY ca.created_at DESC
LIMIT 10;

-- 7. Estatísticas gerais
SELECT 'Estatísticas gerais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as analises_falharam,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as analises_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as analises_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;
