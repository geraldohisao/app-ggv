-- 🔧 CORRIGIR: Scorecard "Ligação - Consultoria" para incluir "Ligação"
-- Script para adicionar "Ligação" aos target_call_types do scorecard

-- 1. Verificar scorecard atual "Ligação - Consultoria"
SELECT 'Scorecard atual Ligação - Consultoria:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines,
    s.active
FROM scorecards s
WHERE s.name = 'Ligação - Consultoria'
AND s.active = true;

-- 2. Adicionar "Ligação" aos target_call_types
UPDATE scorecards 
SET 
    target_call_types = array_append(target_call_types, 'Ligação'),
    updated_at = NOW()
WHERE name = 'Ligação - Consultoria'
AND active = true;

-- 3. Verificar se a atualização funcionou
SELECT 'Scorecard após correção:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types,
    s.target_pipelines,
    s.active
FROM scorecards s
WHERE s.name = 'Ligação - Consultoria'
AND s.active = true;

-- 4. Verificar se "Ligação" está nos target_call_types
SELECT 'Verificando se Ligação está nos target_call_types:' as info;
SELECT 
    s.id,
    s.name,
    s.target_call_types
FROM scorecards s
WHERE s.active = true
AND 'Ligação' = ANY(s.target_call_types);

-- 5. Testar seleção inteligente de scorecard para "Ligação"
SELECT 'Testando seleção inteligente para Ligação:' as info;
SELECT * FROM get_scorecard_smart(
    'Ligação',  -- call_type
    'GGV Inteligência em Vendas',  -- pipeline
    'Inbound - Consultoria (-100k/mês)'  -- cadence
);
