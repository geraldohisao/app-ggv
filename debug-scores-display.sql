-- 🔍 DEBUG: Verificar por que notas não aparecem
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se há análises com notas
SELECT 
    'Análises com notas:' as info,
    COUNT(*) as total_analises,
    COUNT(CASE WHEN final_grade IS NOT NULL THEN 1 END) as com_nota,
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as sem_nota
FROM call_analysis;

-- 2. Verificar scorecard na tabela calls
SELECT 
    'Scorecard na tabela calls:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN scorecard IS NOT NULL AND scorecard != '{}' THEN 1 END) as com_scorecard,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL THEN 1 END) as com_final_score
FROM calls;

-- 3. Verificar se as notas estão sendo exibidas corretamente
SELECT 
    'Exemplos de ligações com notas:' as info,
    c.id,
    c.agent_id,
    c.call_type,
    c.scorecard->>'final_score' as scorecard_final_score,
    ca.final_grade as analysis_final_grade,
    ca.general_feedback
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE (c.scorecard->>'final_score' IS NOT NULL AND c.scorecard->>'final_score' != 'null')
   OR ca.final_grade IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 4. Verificar se há problema na sincronização
SELECT 
    'Verificando sincronização:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN c.scorecard->>'final_score' IS NOT NULL THEN 1 END) as calls_com_scorecard,
    COUNT(CASE WHEN ca.final_grade IS NOT NULL THEN 1 END) as calls_com_analise,
    COUNT(CASE WHEN c.scorecard->>'final_score' IS NOT NULL AND ca.final_grade IS NOT NULL THEN 1 END) as calls_sincronizadas
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id;

-- 5. Forçar sincronização das notas
UPDATE calls 
SET scorecard = jsonb_set(
    COALESCE(scorecard, '{}'::jsonb),
    '{final_score}',
    to_jsonb(ca.final_grade)
)
FROM call_analysis ca
WHERE calls.id = ca.call_id
AND ca.final_grade IS NOT NULL
AND ca.final_grade > 0;

-- 6. Verificar resultado da sincronização
SELECT 
    'Após sincronização:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL AND scorecard->>'final_score' != 'null' THEN 1 END) as calls_com_notas
FROM calls;
