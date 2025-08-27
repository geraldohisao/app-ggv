-- Script para sincronizar usuários da tabela calls
-- Execute este script no Supabase SQL Editor

-- 1. Verificar usuários únicos nas chamadas
SELECT 
    'agent_id' as source,
    agent_id as user_id,
    sdr_name as user_name,
    COUNT(*) as call_count
FROM public.calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id, sdr_name

UNION ALL

SELECT 
    'sdr_id' as source,
    sdr_id as user_id,
    sdr_name as user_name,
    COUNT(*) as call_count
FROM public.calls 
WHERE sdr_id IS NOT NULL
GROUP BY sdr_id, sdr_name

ORDER BY call_count DESC;

-- 2. Sincronizar agent_id para user_mapping
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    agent_id,
    COALESCE(sdr_name, 'Usuário ' || agent_id) as full_name,
    'user' as role
FROM public.calls 
WHERE agent_id IS NOT NULL
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 3. Sincronizar sdr_id para user_mapping (se não existir)
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    sdr_id,
    COALESCE(sdr_name, 'SDR ' || sdr_id) as full_name,
    'sdr' as role
FROM public.calls 
WHERE sdr_id IS NOT NULL 
AND sdr_id NOT IN (SELECT agent_id FROM public.user_mapping)
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 4. Verificar resultado da sincronização
SELECT 
    agent_id,
    full_name,
    role,
    created_at
FROM public.user_mapping 
ORDER BY full_name;

-- 5. Criar função para sincronização automática
CREATE OR REPLACE FUNCTION sync_users_from_calls()
RETURNS void AS $$
BEGIN
    -- Sincronizar agent_id
    INSERT INTO public.user_mapping (agent_id, full_name, role)
    SELECT DISTINCT 
        agent_id,
        COALESCE(sdr_name, 'Usuário ' || agent_id) as full_name,
        'user' as role
    FROM public.calls 
    WHERE agent_id IS NOT NULL
    ON CONFLICT (agent_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Sincronizar sdr_id
    INSERT INTO public.user_mapping (agent_id, full_name, role)
    SELECT DISTINCT 
        sdr_id,
        COALESCE(sdr_name, 'SDR ' || sdr_id) as full_name,
        'sdr' as role
    FROM public.calls 
    WHERE sdr_id IS NOT NULL 
    AND sdr_id NOT IN (SELECT agent_id FROM public.user_mapping)
    ON CONFLICT (agent_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql;

-- 6. Testar a função
SELECT sync_users_from_calls();

-- 7. Verificar estatísticas finais
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as users,
    COUNT(CASE WHEN role = 'sdr' THEN 1 END) as sdrs
FROM public.user_mapping;

-- 8. Verificar usuários com mais ligações
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    COUNT(c.id) as total_calls
FROM public.user_mapping um
LEFT JOIN public.calls c ON um.agent_id = c.agent_id OR um.agent_id = c.sdr_id
GROUP BY um.agent_id, um.full_name, um.role
ORDER BY total_calls DESC
LIMIT 10;
