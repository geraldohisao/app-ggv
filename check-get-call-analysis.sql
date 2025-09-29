-- 🔍 VERIFICAR: Função get_call_analysis
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a função get_call_analysis existe
SELECT '1. Verificando função get_call_analysis:' as info;
SELECT 
    proname,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_call_analysis';

-- 2. Testar a função get_call_analysis com uma ligação que tem nota
SELECT '2. Testando função get_call_analysis:' as info;
SELECT * FROM get_call_analysis('e7c230f9-391f-440e-b146-9af4fddab0e3');

-- 3. Verificar dados brutos da tabela call_analysis
SELECT '3. Dados brutos da tabela call_analysis:' as info;
SELECT 
    id,
    call_id,
    final_grade,
    general_feedback,
    created_at
FROM call_analysis 
WHERE call_id = 'e7c230f9-391f-440e-b146-9af4fddab0e3';

-- 4. Verificar se há outras ligações com análise
SELECT '4. Outras ligações com análise:' as info;
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
