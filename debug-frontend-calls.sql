-- Script para debugar se o problema está no frontend ou na função
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a função está realmente retornando dados da Andressa
SELECT 'VERIFICAÇÃO 1 - FUNÇÃO GET_CALLS_V2' as status;
SELECT 
    id,
    agent_id,
    sdr_name,
    status,
    call_type,
    created_at
FROM public.get_calls_v2(50, 0, NULL, NULL, NULL, NULL, NULL)
WHERE agent_id = '1018-Andressa'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se há dados na função sem filtro
SELECT 'VERIFICAÇÃO 2 - TODOS OS DADOS DA FUNÇÃO' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
GROUP BY agent_id, sdr_name
ORDER BY total_calls DESC
LIMIT 20;

-- 3. Verificar se o problema é com o filtro de usuário
SELECT 'VERIFICAÇÃO 3 - FILTRO POR USUÁRIO' as status;
SELECT 
    id,
    agent_id,
    sdr_name,
    status,
    call_type,
    created_at
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE sdr_name LIKE '%Andressa%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se há problemas com o agent_id específico
SELECT 'VERIFICAÇÃO 4 - AGENT_ID ESPECÍFICO' as status;
SELECT 
    c.id,
    c.agent_id,
    c.sdr_id,
    um.full_name as mapping_name,
    c.status,
    c.created_at
FROM public.calls c
LEFT JOIN public.user_mapping um ON c.agent_id = um.agent_id
WHERE c.agent_id = '1018-Andressa'
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. Verificar se a função está sendo chamada corretamente
SELECT 'VERIFICAÇÃO 5 - TESTE DE PARÂMETROS' as status;
SELECT 
    'Teste 1 - Sem filtros:' as test,
    COUNT(*) as total
FROM public.get_calls_v2(50, 0, NULL, NULL, NULL, NULL, NULL)
UNION ALL
SELECT 
    'Teste 2 - Com filtro de status:' as test,
    COUNT(*) as total
FROM public.get_calls_v2(50, 0, NULL, 'processed', NULL, NULL, NULL)
UNION ALL
SELECT 
    'Teste 3 - Com filtro de tipo:' as test,
    COUNT(*) as total
FROM public.get_calls_v2(50, 0, NULL, NULL, 'ligacao', NULL, NULL);

-- 6. Verificar se há problemas de cache ou RLS
SELECT 'VERIFICAÇÃO 6 - PERMISSÕES E RLS' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('calls', 'user_mapping', 'profiles')
ORDER BY tablename, policyname;

-- 7. Verificar se a função tem as permissões corretas
SELECT 'VERIFICAÇÃO 7 - PERMISSÕES DA FUNÇÃO' as status;
SELECT 
    proname as function_name,
    proacl as permissions
FROM pg_proc 
WHERE proname = 'get_calls_v2';

-- 8. Testar busca direta na tabela calls
SELECT 'VERIFICAÇÃO 8 - BUSCA DIRETA' as status;
SELECT 
    id,
    agent_id,
    sdr_id,
    status,
    call_type,
    created_at
FROM public.calls 
WHERE agent_id = '1018-Andressa'
ORDER BY created_at DESC
LIMIT 10;

-- 9. Verificar se há problemas de encoding ou caracteres especiais
SELECT 'VERIFICAÇÃO 9 - ENCODING E CARACTERES' as status;
SELECT 
    agent_id,
    LENGTH(agent_id) as length,
    ASCII(SUBSTRING(agent_id, 1, 1)) as first_char_ascii,
    agent_id ~ '^[a-zA-Z0-9\-]+$' as is_alphanumeric
FROM public.calls 
WHERE agent_id = '1018-Andressa'
LIMIT 5;

-- 10. Resumo do debug
SELECT 'RESUMO DO DEBUG' as status;
SELECT 
    '🔍 Verificando se função retorna dados da Andressa' as message
UNION ALL
SELECT 
    '🔍 Verificando se há problemas de filtro' as message
UNION ALL
SELECT 
    '🔍 Verificando permissões e RLS' as message
UNION ALL
SELECT 
    '🔍 Verificando encoding e caracteres' as message
UNION ALL
SELECT 
    '🔍 Verificando se problema está no frontend' as message;
