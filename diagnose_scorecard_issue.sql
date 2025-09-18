-- diagnose_scorecard_issue.sql
-- Diagnosticar e corrigir problemas com scorecards

-- 1. Verificar scorecards existentes
SELECT 'SCORECARDS EXISTENTES:' as info;
SELECT 
    id,
    name,
    active,
    target_call_types,
    target_pipelines,
    target_cadences,
    created_at
FROM scorecards 
ORDER BY created_at DESC;

-- 2. Verificar se há scorecards ativos
SELECT 'SCORECARDS ATIVOS:' as info;
SELECT COUNT(*) as total_ativos FROM scorecards WHERE active = true;

-- 3. Testar a função get_scorecard_smart
SELECT 'TESTE DA FUNÇÃO get_scorecard_smart:' as info;
SELECT * FROM get_scorecard_smart('consultoria', 'vendas', 'inbound');

-- 4. Verificar dados da chamada que está sendo testada
SELECT 'DADOS DA CHAMADA TESTE:' as info;
SELECT 
    id,
    call_type,
    pipeline,
    cadence,
    duration,
    transcription IS NOT NULL as has_transcription
FROM calls 
WHERE id = '047724a1-3d40-41ed-921a-15a3c3a620fe';

-- 5. Se não houver scorecards ativos, criar um scorecard padrão
INSERT INTO scorecards (
    id,
    name,
    description,
    active,
    target_call_types,
    target_pipelines,
    target_cadences,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    'Scorecard Padrão GGV',
    'Scorecard padrão para análise de chamadas quando não há match específico',
    true,
    ARRAY['consultoria', 'vendas', 'diagnostico']::text[],
    ARRAY['GGV Inteligência em Vendas', 'vendas']::text[],
    ARRAY['Inbound - Consultoria', 'inbound']::text[],
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM scorecards WHERE active = true);

-- 6. Criar critérios básicos para o scorecard padrão (se necessário)
INSERT INTO scorecard_criteria (
    id,
    scorecard_id,
    name,
    description,
    weight,
    max_score,
    order_index,
    created_at
)
SELECT 
    gen_random_uuid(),
    s.id,
    criterio.name,
    criterio.description,
    criterio.weight,
    10,
    criterio.order_index,
    NOW()
FROM scorecards s,
(VALUES 
    ('Apresentação Profissional', 'Verificar se o vendedor se apresentou adequadamente', 15, 1),
    ('Identificação do Objetivo', 'Verificar se o objetivo da ligação foi esclarecido', 20, 2),
    ('Descoberta de Necessidades', 'Verificar se foram feitas perguntas para entender as necessidades', 25, 3),
    ('Apresentação de Solução', 'Verificar se foi apresentada uma solução adequada', 20, 4),
    ('Próximos Passos', 'Verificar se foram definidos próximos passos ou agendamento', 20, 5)
) AS criterio(name, description, weight, order_index)
WHERE s.name = 'Scorecard Padrão GGV'
AND NOT EXISTS (
    SELECT 1 FROM scorecard_criteria sc 
    WHERE sc.scorecard_id = s.id
);

-- 7. Verificar resultado final
SELECT 'RESULTADO FINAL:' as info;
SELECT 
    s.name,
    s.active,
    s.target_call_types,
    COUNT(sc.id) as criterios_count
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.active = true
GROUP BY s.id, s.name, s.active, s.target_call_types;

-- 8. Testar novamente a função
SELECT 'TESTE FINAL:' as info;
SELECT 
    name,
    match_score,
    is_active
FROM get_scorecard_smart('consultoria', 'vendas', 'inbound');

SELECT '✅ Diagnóstico concluído!' as status;
