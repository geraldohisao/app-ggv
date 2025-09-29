-- 🧪 TESTE: RPC get_calls_with_filters corrigida
-- Execute este script no SQL Editor do Supabase

-- 1. Testar função sem filtros
SELECT 'Testando função sem filtros:' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    status_voip,
    status_voip_friendly,
    to_number,
    from_number,
    score,
    total_count
FROM get_calls_with_filters(
    null, null, null, null, null, 5, 0, 'created_at', null, null, null, null
)
ORDER BY created_at DESC;

-- 2. Verificar se a função existe
SELECT 'Verificando se a função existe:' as info;
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'get_calls_with_filters';

-- 3. Verificar dados brutos da tabela calls
SELECT 'Dados brutos da tabela calls:' as info;
SELECT 
    id,
    enterprise,
    person,
    call_type,
    status_voip,
    status_voip_friendly,
    to_number,
    from_number,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar JOIN com call_analysis
SELECT 'JOIN com call_analysis:' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.call_type,
    c.status_voip,
    c.to_number,
    ca.final_grade,
    c.created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
ORDER BY c.created_at DESC
LIMIT 5;
