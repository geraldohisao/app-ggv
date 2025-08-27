-- Script para debugar especificamente as chamadas da Andressa
-- Execute este script no Supabase SQL Editor

-- 1. Verificar todas as chamadas da Andressa na tabela calls
SELECT 'CHAMADAS DA ANDRESSA NA TABELA CALLS' as status;
SELECT 
    id,
    agent_id,
    sdr_id,
    status,
    call_type,
    duration,
    created_at,
    recording_url,
    transcription
FROM public.calls 
WHERE agent_id LIKE '%Andressa%' 
   OR agent_id LIKE '%andressa%'
ORDER BY created_at DESC;

-- 2. Verificar se Andressa está na tabela user_mapping
SELECT 'ANDRESSA NA TABELA USER_MAPPING' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role,
    created_at
FROM public.user_mapping 
WHERE full_name LIKE '%Andressa%' 
   OR agent_id LIKE '%Andressa%'
   OR agent_id LIKE '%andressa%'
ORDER BY created_at;

-- 3. Verificar se Andressa está na tabela profiles
SELECT 'ANDRESSA NA TABELA PROFILES' as status;
SELECT 
    id,
    full_name,
    email,
    role,
    created_at
FROM public.profiles 
WHERE full_name LIKE '%Andressa%' 
   OR email LIKE '%andressa%'
ORDER BY created_at;

-- 4. Testar a função get_calls_v2 especificamente para Andressa
SELECT 'TESTE DA FUNÇÃO GET_CALLS_V2 PARA ANDRESSA' as status;
SELECT 
    id,
    agent_id,
    sdr_id,
    sdr_name,
    status,
    call_type,
    created_at
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE agent_id LIKE '%Andressa%' 
   OR agent_id LIKE '%andressa%'
   OR sdr_name LIKE '%Andressa%'
ORDER BY created_at DESC;

-- 5. Verificar se há problemas de JOIN
SELECT 'VERIFICANDO PROBLEMAS DE JOIN' as status;
SELECT 
    c.id,
    c.agent_id,
    c.sdr_id,
    p.full_name as profile_name,
    um.full_name as mapping_name,
    c.status,
    c.created_at
FROM public.calls c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
LEFT JOIN public.user_mapping um ON c.agent_id = um.agent_id
WHERE c.agent_id LIKE '%Andressa%' 
   OR c.agent_id LIKE '%andressa%'
ORDER BY c.created_at DESC;

-- 6. Verificar se o agent_id da Andressa está correto
SELECT 'VERIFICANDO AGENT_ID DA ANDRESSA' as status;
SELECT DISTINCT
    agent_id,
    COUNT(*) as total_calls
FROM public.calls 
WHERE agent_id LIKE '%Andressa%' 
   OR agent_id LIKE '%andressa%'
GROUP BY agent_id
ORDER BY total_calls DESC;

-- 7. Verificar se há chamadas sem agent_id
SELECT 'VERIFICANDO CHAMADAS SEM AGENT_ID' as status;
SELECT 
    id,
    agent_id,
    sdr_id,
    status,
    created_at
FROM public.calls 
WHERE agent_id IS NULL 
   OR agent_id = ''
ORDER BY created_at DESC
LIMIT 10;

-- 8. Testar busca direta na tabela calls
SELECT 'BUSCA DIRETA NA TABELA CALLS' as status;
SELECT 
    id,
    agent_id,
    sdr_id,
    status,
    call_type,
    created_at
FROM public.calls 
ORDER BY created_at DESC
LIMIT 20;

-- 9. Verificar se a função está retornando dados
SELECT 'VERIFICAÇÃO GERAL DA FUNÇÃO' as status;
SELECT 
    'Total de chamadas na função:' as info,
    COUNT(*) as total
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
UNION ALL
SELECT 
    'Chamadas com agent_id:' as info,
    COUNT(*) as total
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE agent_id IS NOT NULL
UNION ALL
SELECT 
    'Chamadas com sdr_name:' as info,
    COUNT(*) as total
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE sdr_name IS NOT NULL;

-- 10. Resumo do problema
SELECT 'RESUMO DO PROBLEMA' as status;
SELECT 
    '🔍 Investigando por que Andressa não aparece no frontend' as message
UNION ALL
SELECT 
    '🔍 Verificando dados na tabela calls' as message
UNION ALL
SELECT 
    '🔍 Verificando mapeamento na user_mapping' as message
UNION ALL
SELECT 
    '🔍 Verificando função get_calls_v2' as message
UNION ALL
SELECT 
    '🔍 Verificando problemas de JOIN' as message;
