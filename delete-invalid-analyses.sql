-- 🗑️ DELETAR ANÁLISES INVÁLIDAS
-- Remove análises com dados inconsistentes do banco

-- =========================================
-- PARTE 1: IDENTIFICAR ANÁLISES INVÁLIDAS
-- =========================================

SELECT '=== ANÁLISES INVÁLIDAS (overall_score > max_possible_score) ===' as info;

SELECT 
    id,
    call_id,
    scorecard_name,
    overall_score,
    max_possible_score,
    final_grade,
    created_at,
    CASE 
        WHEN overall_score > max_possible_score THEN '❌ Score maior que máximo'
        WHEN max_possible_score > 500 THEN '❌ max_score estava 10 (incorreto)'
        WHEN max_possible_score < 10 THEN '❌ max_possible_score muito baixo'
        ELSE '✅ OK'
    END as problema
FROM call_analysis
WHERE overall_score > max_possible_score
   OR max_possible_score > 500
   OR max_possible_score < 10
ORDER BY created_at DESC
LIMIT 20;

-- =========================================
-- PARTE 2: DELETAR ANÁLISES INVÁLIDAS
-- =========================================

SELECT '=== DELETANDO ANÁLISES INVÁLIDAS ===' as info;

WITH deleted AS (
    DELETE FROM call_analysis
    WHERE overall_score > max_possible_score  -- Score impossível
       OR max_possible_score > 500           -- max_score estava 10
       OR max_possible_score < 10            -- Muito baixo
    RETURNING id, call_id, final_grade, overall_score, max_possible_score
)
SELECT 
    COUNT(*) as total_deletadas,
    '✅ Análises inválidas removidas' as resultado
FROM deleted;

-- Mostrar algumas que foram deletadas
WITH deleted AS (
    DELETE FROM call_analysis
    WHERE overall_score > max_possible_score
       OR max_possible_score > 500
       OR max_possible_score < 10
    RETURNING id, call_id, final_grade, overall_score, max_possible_score
)
SELECT 
    id,
    call_id,
    final_grade,
    overall_score,
    max_possible_score,
    'Deletada' as status
FROM deleted
LIMIT 10;

-- =========================================
-- PARTE 3: VERIFICAR ANÁLISES RESTANTES
-- =========================================

SELECT '=== ANÁLISES VÁLIDAS RESTANTES ===' as info;

SELECT 
    COUNT(*) as total_analises_validas,
    ROUND(AVG(final_grade), 2) as media_notas,
    MIN(final_grade) as nota_minima,
    MAX(final_grade) as nota_maxima,
    ROUND(AVG(max_possible_score), 2) as media_max_possible_score
FROM call_analysis;

-- =========================================
-- RESULTADO
-- =========================================

SELECT '
✅ LIMPEZA COMPLETA!

1. ✅ Análises inválidas identificadas
   - overall_score > max_possible_score
   - max_possible_score > 500 (max_score estava 10)
   - max_possible_score < 10 (muito baixo)

2. ✅ Análises inválidas deletadas
   - Removidas do banco automaticamente
   - Chamadas podem ser reanalisadas

3. 🎯 PRÓXIMO PASSO:
   - Hard refresh (Ctrl+Shift+R)
   - Abrir chamadas que tinham nota 8.0
   - Agora deve mostrar: "Nenhuma análise disponível"
   - Clicar em "Analisar com IA" para análise nova e correta

' as resultado;

