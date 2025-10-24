-- =====================================================
-- TESTE RÁPIDO: TODOS OS FILTROS
-- =====================================================

-- 1️⃣ Filtro SDR
SELECT '1. SDR = Mariana:' as filtro, COUNT(*) as total
FROM get_calls_with_filters('mariana', NULL, NULL, NULL, NULL, 5000, 0);

-- 2️⃣ Filtro Status  
SELECT '2. Status = Atendida:' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, 'normal_clearing', NULL, NULL, NULL, 5000, 0);

-- 3️⃣ Filtro Tipo
SELECT '3. Tipo = diagnostico:' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, 'diagnostico', NULL, NULL, 5000, 0);

-- 4️⃣ Filtro Duração Mínima
SELECT '4. Duração >= 180s (3 min):' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5000, 0, 'created_at', 180, NULL, NULL, NULL);

-- 5️⃣ Filtro Duração Máxima
SELECT '5. Duração <= 60s (1 min):' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5000, 0, 'created_at', NULL, 60, NULL, NULL);

-- 6️⃣ Filtro Nota Mínima
SELECT '6. Nota >= 8:' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5000, 0, 'created_at', NULL, NULL, 8.0, NULL);

-- 7️⃣ Filtro Busca
SELECT '7. Busca = Spósito:' as filtro, COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5000, 0, 'created_at', NULL, NULL, NULL, 'Spósito');

-- 8️⃣ Ver exemplos com nota >= 8
SELECT '8. EXEMPLOS com nota >= 8:' as filtro;
SELECT 
    company_name,
    person_name,
    score,
    duration_formated
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0, 'created_at', NULL, NULL, 8.0, NULL)
ORDER BY score DESC;

