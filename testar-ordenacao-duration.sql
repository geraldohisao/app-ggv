-- =====================================================
-- TESTE: Verificar se ordenação de duração é global
-- =====================================================

-- 1️⃣ Top 20 MAIORES durações do sistema (página 1, offset 0)
SELECT 
    '1. Página 1 (offset 0) - Top 20 MAIORES durações:' as teste;

SELECT 
    company_name,
    duration,
    duration_formated,
    score
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0, 'duration', NULL, NULL, NULL, NULL)
ORDER BY duration DESC;

-- 2️⃣ Próximas 20 (página 2, offset 20)
SELECT 
    '2. Página 2 (offset 20) - Próximas 20:' as teste;

SELECT 
    company_name,
    duration,
    duration_formated,
    score
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 20, 'duration', NULL, NULL, NULL, NULL)
ORDER BY duration DESC;

-- 3️⃣ Comparar: menor duração da página 1 vs maior duração da página 2
SELECT 
    '3. VALIDAÇÃO - Página 1 MIN deve ser > Página 2 MAX:' as teste;

WITH page1 AS (
    SELECT duration
    FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0, 'duration', NULL, NULL, NULL, NULL)
),
page2 AS (
    SELECT duration
    FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 20, 'duration', NULL, NULL, NULL, NULL)
)
SELECT 
    (SELECT MIN(duration) FROM page1) as min_page1,
    (SELECT MAX(duration) FROM page2) as max_page2,
    CASE 
        WHEN (SELECT MIN(duration) FROM page1) >= (SELECT MAX(duration) FROM page2) 
        THEN '✅ CORRETO! Ordenação global funciona'
        ELSE '❌ ERRO! Página 2 tem duração maior que página 1'
    END as resultado;

SELECT '
📊 INTERPRETAÇÃO:

✅ SE "min_page1 >= max_page2":
   - Ordenação global está funcionando!
   - Página 1 sempre tem as MAIORES durações
   - Problema pode ser no frontend

❌ SE "min_page1 < max_page2":
   - Ordenação NÃO é global!
   - Backend está ordenando por página
   - Precisa corrigir SQL

' as info;

