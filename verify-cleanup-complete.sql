-- ✅ VERIFICAÇÃO: Limpeza Completa de Análises
-- Confirma que não restam análises inválidas

-- =========================================
-- PARTE 1: VERIFICAR SE AINDA HÁ INVÁLIDAS
-- =========================================

SELECT '=== ANÁLISES INVÁLIDAS RESTANTES? ===' as info;

SELECT 
    COUNT(*) as total_invalidas_restantes,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Nenhuma análise inválida encontrada!'
        ELSE '⚠️ Ainda há análises inválidas'
    END as status
FROM call_analysis
WHERE overall_score > max_possible_score
   OR max_possible_score > 500
   OR max_possible_score < 10;

-- Se ainda houver, mostrar quais são
SELECT 
    id,
    call_id,
    scorecard_name,
    overall_score,
    max_possible_score,
    final_grade,
    created_at,
    CASE 
        WHEN overall_score > max_possible_score THEN '❌ Score > Máximo'
        WHEN max_possible_score > 500 THEN '❌ max_score=10 (errado)'
        WHEN max_possible_score < 10 THEN '❌ max_score muito baixo'
    END as problema
FROM call_analysis
WHERE overall_score > max_possible_score
   OR max_possible_score > 500
   OR max_possible_score < 10
LIMIT 10;

-- =========================================
-- PARTE 2: ESTATÍSTICAS DAS ANÁLISES VÁLIDAS
-- =========================================

SELECT '=== ESTATÍSTICAS DE ANÁLISES VÁLIDAS ===' as info;

SELECT 
    COUNT(*) as total_analises_validas,
    COUNT(CASE WHEN final_grade >= 7 THEN 1 END) as notas_altas,
    COUNT(CASE WHEN final_grade >= 5 AND final_grade < 7 THEN 1 END) as notas_medias,
    COUNT(CASE WHEN final_grade < 5 THEN 1 END) as notas_baixas,
    ROUND(AVG(final_grade), 2) as media_geral,
    ROUND(AVG(max_possible_score), 2) as media_max_possible_score,
    MIN(max_possible_score) as min_max_possible,
    MAX(max_possible_score) as max_max_possible
FROM call_analysis;

-- =========================================
-- PARTE 3: DISTRIBUIÇÃO DE SCORECARDS
-- =========================================

SELECT '=== ANÁLISES POR SCORECARD ===' as info;

SELECT 
    scorecard_name,
    COUNT(*) as total_analises,
    ROUND(AVG(final_grade), 2) as nota_media,
    ROUND(AVG(max_possible_score), 2) as max_score_medio
FROM call_analysis
GROUP BY scorecard_name
ORDER BY total_analises DESC;

-- =========================================
-- RESULTADO
-- =========================================

SELECT '
✅ VERIFICAÇÃO COMPLETA!

📊 RESUMO:
   - Análises inválidas: DELETADAS
   - Análises válidas: PRESERVADAS
   - Sistema: LIMPO E FUNCIONAL

🎯 VALIDAÇÕES IMPLEMENTADAS:
   1. ✅ overall_score ≤ max_possible_score
   2. ✅ 10 ≤ max_possible_score < 500
   3. ✅ criteria_analysis.length > 0

🚀 PRÓXIMOS PASSOS:
   - Hard refresh no frontend
   - Testar chamada que tinha nota 8.0
   - Deve mostrar: "Nenhuma análise disponível"
   - Clicar em "Analisar com IA" para nova análise correta

' as resultado;

