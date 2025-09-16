-- =========================================
-- DEBUG: DISCREPÂNCIA NA CONTAGEM DE NOTAS
-- Investigar por que há diferença entre painel e filtros
-- =========================================

-- 1. Contagem do painel (call_analysis.final_grade)
SELECT 
    '=== CONTAGEM DO PAINEL (call_analysis) ===' as fonte;

SELECT 
    COUNT(*) as total_com_nota_call_analysis
FROM call_analysis 
WHERE final_grade IS NOT NULL;

-- 2. Contagem via scorecard JSONB
SELECT 
    '=== CONTAGEM VIA SCORECARD JSONB ===' as fonte;

SELECT 
    COUNT(*) as total_com_scorecard,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL THEN 1 END) as com_final_score,
    COUNT(CASE WHEN scorecard->>'total_score' IS NOT NULL THEN 1 END) as com_total_score,
    COUNT(CASE WHEN scorecard->>'score' IS NOT NULL THEN 1 END) as com_score
FROM calls 
WHERE scorecard IS NOT NULL 
  AND scorecard != 'null'::jsonb;

-- 3. Contagem combinada (como o frontend faz)
SELECT 
    '=== CONTAGEM COMBINADA (LÓGICA DO FRONTEND) ===' as fonte;

WITH call_scores AS (
    SELECT 
        c.id,
        -- Score da análise
        ca.final_grade as analysis_score,
        -- Score do scorecard
        CASE 
            WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                COALESCE(
                    (c.scorecard->>'final_score')::NUMERIC,
                    (c.scorecard->>'total_score')::NUMERIC,
                    (c.scorecard->>'score')::NUMERIC
                )
            ELSE NULL
        END as scorecard_score,
        -- Score final (mesma lógica do convertToCallItem)
        COALESCE(
            ca.final_grade,
            CASE 
                WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                    COALESCE(
                        (c.scorecard->>'final_score')::NUMERIC,
                        (c.scorecard->>'total_score')::NUMERIC,
                        (c.scorecard->>'score')::NUMERIC
                    )
                ELSE NULL
            END
        ) as final_score
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id
)
SELECT 
    COUNT(*) as total_calls,
    COUNT(analysis_score) as com_analysis_score,
    COUNT(scorecard_score) as com_scorecard_score,
    COUNT(final_score) as com_score_final_combinado
FROM call_scores;

-- 4. Verificar duplicatas ou problemas
SELECT 
    '=== VERIFICANDO DUPLICATAS ===' as verificacao;

SELECT 
    call_id,
    COUNT(*) as vezes_analisada
FROM call_analysis 
WHERE final_grade IS NOT NULL
GROUP BY call_id
HAVING COUNT(*) > 1
ORDER BY vezes_analisada DESC
LIMIT 5;

-- 5. Verificar chamadas com múltiplas fontes de score
SELECT 
    '=== CHAMADAS COM MÚLTIPLAS FONTES DE SCORE ===' as multiplas;

SELECT 
    c.id,
    ca.final_grade as analysis_score,
    c.scorecard->>'final_score' as scorecard_final,
    c.scorecard->>'total_score' as scorecard_total,
    c.scorecard->>'score' as scorecard_score
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE (ca.final_grade IS NOT NULL OR 
       (c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb))
ORDER BY c.created_at DESC
LIMIT 10;

SELECT 'Investigação de discrepância de contagem de notas concluída!' as status;
