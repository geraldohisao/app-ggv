-- Script para criar nomes legíveis para usuários sem perfil
-- Execute este script no Supabase SQL Editor

-- 1. Verificar situação atual
SELECT 'SITUAÇÃO ATUAL' as status;
SELECT 
    agent_id,
    full_name,
    role,
    CASE 
        WHEN full_name LIKE 'SDR %' THEN 'SDR sem perfil'
        WHEN full_name LIKE 'Usuário %' THEN 'Usuário sem perfil'
        ELSE 'Nome real do perfil'
    END as status
FROM public.user_mapping 
ORDER BY full_name;

-- 2. Criar nomes legíveis para SDRs sem perfil
UPDATE public.user_mapping 
SET full_name = 'SDR ' || SUBSTRING(agent_id, 1, 8) || '...'
WHERE full_name LIKE 'SDR %'
AND agent_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Criar nomes legíveis para usuários sem perfil
UPDATE public.user_mapping 
SET full_name = CASE 
    WHEN agent_id LIKE '%Camila%' THEN 'Camila (sem perfil)'
    WHEN agent_id LIKE '%Andressa%' THEN 'Andressa (sem perfil)'
    WHEN agent_id LIKE '%Isabel%' THEN 'Isabel (sem perfil)'
    WHEN agent_id LIKE '%Mariana%' THEN 'Mariana (sem perfil)'
    WHEN agent_id LIKE '%Lô-Ruama%' THEN 'Lô-Ruama (sem perfil)'
    WHEN agent_id LIKE 'agent_%' THEN 'Agente ' || SUBSTRING(agent_id, 8)
    ELSE 'Usuário ' || SUBSTRING(agent_id, 1, 10) || '...'
END
WHERE full_name LIKE 'Usuário %';

-- 4. Verificar resultado final
SELECT 'RESULTADO FINAL' as status;
SELECT 
    agent_id,
    full_name,
    role,
    CASE 
        WHEN full_name LIKE 'SDR %' AND full_name LIKE '%...' THEN 'SDR sem perfil (nome legível)'
        WHEN full_name LIKE '%(sem perfil)' THEN 'Usuário sem perfil (nome legível)'
        WHEN full_name LIKE 'Agente %' THEN 'Agente (nome legível)'
        ELSE 'Nome real do perfil'
    END as status
FROM public.user_mapping 
ORDER BY full_name;

-- 5. Verificar estatísticas finais
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE '%...' AND full_name NOT LIKE '%(sem perfil)' AND full_name NOT LIKE 'Agente %' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE '%...' OR full_name LIKE '%(sem perfil)' OR full_name LIKE 'Agente %' THEN 1 END) as readable_names
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 6. Verificar usuários com mais ligações
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    COUNT(c.id) as total_calls
FROM public.user_mapping um
LEFT JOIN public.calls c ON um.agent_id = c.agent_id OR um.agent_id = c.sdr_id::TEXT
GROUP BY um.agent_id, um.full_name, um.role
ORDER BY total_calls DESC
LIMIT 15;
