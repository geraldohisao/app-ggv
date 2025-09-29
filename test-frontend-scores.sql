-- 🔍 TESTE: Verificar se frontend recebe as notas
-- Execute este script no SQL Editor do Supabase

-- 1. Testar função get_calls_with_filters com dados reais
SELECT 
    'Testando função com dados reais:' as info,
    id,
    enterprise,
    person,
    call_type,
    scorecard->>'final_score' as final_score,
    status_voip_friendly
FROM get_calls_with_filters(
    null, null, null, null, null, 5, 0, 'created_at', null, null, null, null
);

-- 2. Verificar se há ligações com notas na função
SELECT 
    'Ligações com notas na função:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL AND scorecard->>'final_score' != 'null' THEN 1 END) as com_notas
FROM get_calls_with_filters(
    null, null, null, null, null, 100, 0, 'created_at', null, null, null, null
);

-- 3. Verificar se o problema é na exibição
SELECT 
    'Exemplos de ligações com notas:' as info,
    id,
    enterprise,
    person,
    call_type,
    scorecard,
    status_voip_friendly
FROM get_calls_with_filters(
    null, null, null, null, null, 3, 0, 'created_at', null, null, null, null
)
WHERE scorecard->>'final_score' IS NOT NULL 
AND scorecard->>'final_score' != 'null';
