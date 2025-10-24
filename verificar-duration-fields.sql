-- =====================================================
-- VERIFICAR: duration vs duration_formated
-- =====================================================

-- Ver top 10 chamadas comparando os dois campos
SELECT 
    id,
    enterprise,
    duration as duration_segundos,
    duration_formated,
    -- Calcular segundos do duration_formated para comparar
    CASE 
        WHEN duration_formated IS NOT NULL THEN
            CAST(SPLIT_PART(duration_formated, ':', 1) AS INTEGER) * 3600 +
            CAST(SPLIT_PART(duration_formated, ':', 2) AS INTEGER) * 60 +
            CAST(SPLIT_PART(duration_formated, ':', 3) AS INTEGER)
        ELSE NULL
    END as formated_em_segundos,
    -- Diferença
    CASE 
        WHEN duration_formated IS NOT NULL THEN
            duration - (
                CAST(SPLIT_PART(duration_formated, ':', 1) AS INTEGER) * 3600 +
                CAST(SPLIT_PART(duration_formated, ':', 2) AS INTEGER) * 60 +
                CAST(SPLIT_PART(duration_formated, ':', 3) AS INTEGER)
            )
        ELSE NULL
    END as diferenca
FROM calls
WHERE duration > 0
ORDER BY duration DESC
LIMIT 20;

SELECT '
🔍 INTERPRETAÇÃO:

✅ Se diferenca = 0:
   - duration e duration_formated estão sincronizados
   - Ordenar por duration está correto

❌ Se diferenca != 0:
   - Há inconsistência!
   - Pode ser o motivo da ordenação errada

' as info;

