-- 🧹 LIMPEZA FINAL: Manter apenas 2 scorecards essenciais
-- Este script remove definitivamente os scorecards desnecessários

-- 1. Verificar todos os scorecards
SELECT '1. Todos os scorecards:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

-- 2. Desativar TODOS os scorecards
UPDATE scorecards
SET 
    active = false,
    updated_at = NOW();

-- 3. Verificar se todos foram desativados
SELECT '2. Scorecards após desativação:' as info;
SELECT 
    COUNT(*) as total_scorecards,
    COUNT(CASE WHEN active = true THEN 1 END) as ativos,
    COUNT(CASE WHEN active = false THEN 1 END) as inativos
FROM scorecards;

-- 4. Ativar APENAS "Scorecard Follow Up"
UPDATE scorecards
SET 
    active = true,
    updated_at = NOW()
WHERE name = 'Scorecard Follow Up';

-- 5. Ativar APENAS "Ligação - Consultoria"
UPDATE scorecards
SET 
    active = true,
    updated_at = NOW()
WHERE name = 'Ligação - Consultoria';

-- 6. Verificar scorecards ativos
SELECT '3. Scorecards ativos:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = true
ORDER BY name;

-- 7. Verificar scorecards inativos
SELECT '4. Scorecards inativos:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
WHERE active = false
ORDER BY name;

-- 8. Contar total de scorecards ativos
SELECT '5. Resumo final:' as info;
SELECT 
    COUNT(*) as total_scorecards,
    COUNT(CASE WHEN active = true THEN 1 END) as ativos,
    COUNT(CASE WHEN active = false THEN 1 END) as inativos
FROM scorecards;
