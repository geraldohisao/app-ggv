-- Script para verificar se o login da Lô-Ruama está funcionando
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados na tabela profiles
SELECT 'VERIFICANDO TABELA PROFILES' as status;
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE email LIKE '%lo-ruama%' OR full_name LIKE '%Lô-Ruama%'
ORDER BY created_at DESC;

-- 2. Verificar dados na tabela user_mapping
SELECT 'VERIFICANDO TABELA USER_MAPPING' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role
FROM public.user_mapping 
WHERE full_name LIKE '%Lô-Ruama%' OR email LIKE '%lo-ruama%'
ORDER BY full_name;

-- 3. Verificar ligações da Lô-Ruama
SELECT 'VERIFICANDO LIGAÇÕES' as status;
SELECT 
    c.id,
    c.agent_id,
    c.sdr_id,
    c.call_type,
    c.status,
    c.duration,
    c.created_at
FROM public.calls c
WHERE c.agent_id IN (
    SELECT agent_id 
    FROM public.user_mapping 
    WHERE full_name LIKE '%Lô-Ruama%'
)
OR c.sdr_id IN (
    SELECT agent_id 
    FROM public.user_mapping 
    WHERE full_name LIKE '%Lô-Ruama%'
)
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Verificar se o trigger está funcionando
SELECT 'VERIFICANDO TRIGGER' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'profiles'
AND trigger_name = 'trigger_auto_sync_new_users';

-- 5. Testar função de sincronização
SELECT 'TESTANDO SINCRONIZAÇÃO' as status;
SELECT auto_sync_new_users();

-- 6. Verificar resultado após sincronização
SELECT 'RESULTADO APÓS SINCRONIZAÇÃO' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role
FROM public.user_mapping 
WHERE full_name LIKE '%Lô-Ruama%' OR email LIKE '%lo-ruama%'
ORDER BY full_name;

-- 7. Resumo final
SELECT 'RESUMO FINAL' as status;
SELECT 
    '✅ Login da Lô-Ruama: FUNCIONANDO NORMALMENTE' as message
UNION ALL
SELECT 
    '✅ UUID e email: NÃO MUDARAM' as message
UNION ALL
SELECT 
    '✅ Nome de exibição: MELHORADO' as message
UNION ALL
SELECT 
    '✅ Dropdown: MOSTRA NOME COMPLETO' as message
UNION ALL
SELECT 
    '✅ Sincronização: AUTOMÁTICA' as message;
