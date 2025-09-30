-- 🔍 VERIFICAR DE ONDE VEM A NOTA 8
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar análise mais recente desta chamada
SELECT 'ANÁLISE MAIS RECENTE:' as info;
SELECT 
    ca.id,
    ca.call_id,
    ca.final_grade,
    ca.overall_score,
    ca.general_feedback,
    ca.created_at
FROM call_analysis ca
WHERE ca.call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544'
ORDER BY ca.created_at DESC
LIMIT 3;

-- 2. Verificar scorecard na tabela calls (JSON)
SELECT 'SCORECARD NA TABELA CALLS:' as info;
SELECT 
    id,
    scorecard,
    ai_status
FROM calls 
WHERE id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';

-- 3. Verificar todas as análises desta chamada (histórico)
SELECT 'HISTÓRICO DE ANÁLISES:' as info;
SELECT 
    ca.created_at,
    ca.final_grade,
    ca.general_feedback,
    CASE 
        WHEN ca.general_feedback LIKE '%falha%' OR ca.general_feedback LIKE '%erro%' THEN 'ERRO'
        WHEN ca.final_grade IS NULL THEN 'NULL'
        ELSE 'OK'
    END as status_analysis
FROM call_analysis ca
WHERE ca.call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544'
ORDER BY ca.created_at DESC;

-- 4. Limpar TODAS as análises com erro desta chamada
DELETE FROM call_analysis 
WHERE call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544'
AND (
    general_feedback LIKE '%falha%' 
    OR general_feedback LIKE '%erro%' 
    OR general_feedback LIKE '%indisponível%'
    OR final_grade = 0
);

-- 5. Limpar scorecard da tabela calls também
UPDATE calls 
SET scorecard = NULL,
    ai_status = NULL
WHERE id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';

-- 6. Verificar se limpou
SELECT 'APÓS LIMPEZA:' as info;
SELECT 
    COUNT(*) as analyses_remaining
FROM call_analysis 
WHERE call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';
