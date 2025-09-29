-- 🔍 VERIFICAR: Notas reais na tabela
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se há notas na tabela calls (scorecard)
SELECT 
    'Notas na tabela calls (scorecard):' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN scorecard IS NOT NULL AND scorecard != '{}' THEN 1 END) as com_scorecard,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL AND scorecard->>'final_score' != 'null' THEN 1 END) as com_final_score,
    COUNT(CASE WHEN scorecard->>'total_score' IS NOT NULL AND scorecard->>'total_score' != 'null' THEN 1 END) as com_total_score
FROM calls;

-- 2. Verificar se há notas na tabela call_analysis
SELECT 
    'Notas na tabela call_analysis:' as info,
    COUNT(*) as total_analises,
    COUNT(CASE WHEN final_grade IS NOT NULL THEN 1 END) as com_final_grade,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as com_nota_positiva
FROM call_analysis;

-- 3. Exemplos de ligações com notas
SELECT 
    'Exemplos de ligações com notas:' as info,
    c.id,
    c.agent_id,
    c.call_type,
    c.scorecard->>'final_score' as scorecard_final_score,
    c.scorecard->>'total_score' as scorecard_total_score,
    ca.final_grade as analysis_final_grade
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE (c.scorecard->>'final_score' IS NOT NULL AND c.scorecard->>'final_score' != 'null')
   OR ca.final_grade IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 4. Verificar se o problema é na função get_calls_with_filters
SELECT 
    'Testando função get_calls_with_filters:' as info,
    id,
    enterprise,
    person,
    call_type,
    score,
    scorecard->>'final_score' as scorecard_final_score
FROM get_calls_with_filters(
    null, null, null, null, null, 5, 0, 'created_at', null, null, null, null
)
WHERE score IS NOT NULL
ORDER BY created_at DESC;
