-- 🧹 FORÇA LIMPEZA: Remover scorecards desnecessários
-- Este script força a remoção dos scorecards desnecessários

-- 1. Verificar scorecards atuais
SELECT '1. Scorecards atuais:' as info;
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
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences
FROM scorecards 
ORDER BY name;

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

-- 6. Verificar scorecards ativos após ativação
SELECT '3. Scorecards ativos após ativação:' as info;
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

-- 7. Verificar se há outros scorecards ativos
SELECT '4. Verificação de scorecards ativos:' as info;
SELECT 
    COUNT(*) as total_ativos
FROM scorecards 
WHERE active = true;

-- 8. Listar todos os scorecards inativos
SELECT '5. Scorecards inativos:' as info;
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
