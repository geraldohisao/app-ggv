-- 🔍 DEBUG: Problemas Completos do Sistema
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar função atual
SELECT '1. Verificando função get_calls_with_filters:' as info;
SELECT 
    proname,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 2. Testar função com dados reais
SELECT '2. Testando função com dados reais:' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    score,
    'call_analysis.final_grade' as fonte_score
FROM get_calls_with_filters(
    null, null, null, null, null, 5, 0, 'created_at', null, null, null, null
)
WHERE score IS NOT NULL
ORDER BY score DESC;

-- 3. Verificar dados brutos da tabela calls
SELECT '3. Dados brutos da tabela calls:' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    scorecard->>'final_score' as scorecard_final_score,
    created_at
FROM calls 
WHERE scorecard->>'final_score' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar dados brutos da tabela call_analysis
SELECT '4. Dados brutos da tabela call_analysis:' as info;
SELECT 
    id,
    call_id,
    final_grade,
    general_feedback,
    created_at
FROM call_analysis 
WHERE final_grade IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar JOIN entre calls e call_analysis
SELECT '5. JOIN entre calls e call_analysis:' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.call_type,
    ca.final_grade,
    c.scorecard->>'final_score' as scorecard_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade IS NOT NULL
ORDER BY ca.created_at DESC
LIMIT 5;

-- 6. Verificar se há problemas de RLS (Row Level Security)
SELECT '6. Verificando RLS na tabela calls:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'calls';

-- 7. Verificar permissões da função
SELECT '7. Verificando permissões da função:' as info;
SELECT 
    p.proname,
    p.prosecdef,
    p.proacl
FROM pg_proc p
WHERE p.proname = 'get_calls_with_filters';
