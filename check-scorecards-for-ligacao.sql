-- 🔍 VERIFICAR: Scorecards para etapa "Ligação"
-- Script para verificar quais scorecards estão disponíveis para "Ligação"

-- 1. Verificar todos os scorecards ativos
SELECT 'Todos os scorecards ativos:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines,
    s.active,
    s.created_at
FROM scorecards s
WHERE s.active = true
ORDER BY s.created_at DESC;

-- 2. Verificar scorecards que incluem "Ligação" nos target_call_types
SELECT 'Scorecards com target_call_types contendo Ligação:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines
FROM scorecards s
WHERE s.active = true
AND (
    s.target_call_types::text ILIKE '%Ligação%'
    OR s.target_call_types::text ILIKE '%ligação%'
    OR s.target_call_types::text ILIKE '%Ligação - Consultoria%'
);

-- 3. Verificar se existe scorecard específico para "Ligação"
SELECT 'Scorecards específicos para Ligação:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines
FROM scorecards s
WHERE s.active = true
AND 'Ligação' = ANY(s.target_call_types);

-- 4. Verificar scorecards que podem ser usados como fallback
SELECT 'Scorecards que podem ser usados como fallback:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines
FROM scorecards s
WHERE s.active = true
AND (
    s.target_call_types::text ILIKE '%Consultoria%'
    OR s.target_call_types::text ILIKE '%Ligação%'
    OR s.target_call_types::text ILIKE '%Follow%'
);
