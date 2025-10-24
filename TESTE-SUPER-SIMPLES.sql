-- =====================================================
-- TESTE ULTRA SIMPLES - COPIE E COLE TUDO AQUI
-- =====================================================

-- Ver as 10 MAIORES durações do sistema TODO
SELECT 
    company_name as empresa,
    duration as segundos,
    duration_formated as tempo
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0, 'duration', NULL, NULL, NULL, NULL);

-- SEPADOR
SELECT '=================== AGORA VEJA ACIMA ===================' as aviso;

-- Comparação simples
WITH 
p1 AS (SELECT duration FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1, 0, 'duration', NULL, NULL, NULL, NULL)),
p2 AS (SELECT duration FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1, 50, 'duration', NULL, NULL, NULL, NULL))
SELECT 
    (SELECT duration FROM p1) as primeira_chamada_pagina1,
    (SELECT duration FROM p2) as primeira_chamada_pagina2,
    CASE 
        WHEN (SELECT duration FROM p1) > (SELECT duration FROM p2) 
        THEN 'CORRETO - P1 maior que P2'
        ELSE 'ERRO - P2 maior que P1'
    END as status;

