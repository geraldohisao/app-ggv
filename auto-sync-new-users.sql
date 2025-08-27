-- Script para sincronização automática de novos usuários
-- Execute este script no Supabase SQL Editor

-- 1. Criar função para sincronizar automaticamente novos usuários
CREATE OR REPLACE FUNCTION auto_sync_new_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é um novo usuário na tabela profiles
    IF TG_OP = 'INSERT' THEN
        -- Verificar se o usuário tem ligações na tabela calls
        IF EXISTS (
            SELECT 1 FROM public.calls 
            WHERE agent_id = NEW.id::TEXT OR sdr_id = NEW.id
        ) THEN
            -- Inserir ou atualizar na tabela user_mapping
            INSERT INTO public.user_mapping (agent_id, full_name, role, email)
            VALUES (NEW.id::TEXT, NEW.full_name, COALESCE(NEW.role, 'user'), NEW.email)
            ON CONFLICT (agent_id) DO UPDATE SET
                full_name = NEW.full_name,
                role = COALESCE(NEW.role, 'user'),
                email = NEW.email;
                
            RAISE NOTICE 'Novo usuário % sincronizado automaticamente', NEW.full_name;
        END IF;
    END IF;
    
    -- Se é uma atualização de usuário existente
    IF TG_OP = 'UPDATE' THEN
        -- Atualizar na tabela user_mapping se existir
        UPDATE public.user_mapping 
        SET full_name = NEW.full_name,
            role = COALESCE(NEW.role, 'user'),
            email = NEW.email
        WHERE agent_id = NEW.id::TEXT;
        
        RAISE NOTICE 'Usuário % atualizado automaticamente', NEW.full_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para executar automaticamente
DROP TRIGGER IF EXISTS trigger_auto_sync_new_users ON public.profiles;
CREATE TRIGGER trigger_auto_sync_new_users
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_new_users();

-- 3. Criar função para sincronização manual (executar quando necessário)
CREATE OR REPLACE FUNCTION manual_sync_all_users()
RETURNS void AS $$
BEGIN
    -- Sincronizar todos os usuários da tabela profiles que têm ligações
    INSERT INTO public.user_mapping (agent_id, full_name, role, email)
    SELECT DISTINCT 
        p.id::TEXT,
        p.full_name,
        COALESCE(p.role, 'user'),
        p.email
    FROM public.profiles p
    WHERE EXISTS (
        SELECT 1 FROM public.calls c 
        WHERE c.agent_id = p.id::TEXT OR c.sdr_id = p.id
    )
    ON CONFLICT (agent_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email;
        
    RAISE NOTICE 'Sincronização manual concluída';
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função para limpar nomes legíveis quando usuário criar perfil
CREATE OR REPLACE FUNCTION cleanup_readable_names()
RETURNS void AS $$
BEGIN
    -- Atualizar nomes legíveis com nomes reais quando disponível
    UPDATE public.user_mapping 
    SET full_name = p.full_name,
        role = COALESCE(p.role, 'user'),
        email = p.email
    FROM public.profiles p
    WHERE user_mapping.agent_id = p.id::TEXT
    AND (
        user_mapping.full_name LIKE '%(sem perfil)' OR
        user_mapping.full_name LIKE 'SDR %...' OR
        user_mapping.full_name LIKE 'Usuário %...'
    );
    
    RAISE NOTICE 'Limpeza de nomes legíveis concluída';
END;
$$ LANGUAGE plpgsql;

-- 5. Testar a função manual
SELECT manual_sync_all_users();

-- 6. Verificar resultado
SELECT 'USUÁRIOS SINCRONIZADOS' as status;
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 7. Verificar estatísticas
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE '%(sem perfil)' AND full_name NOT LIKE '%...' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE '%(sem perfil)' OR full_name LIKE '%...' THEN 1 END) as readable_names
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 8. Instruções de uso
SELECT 'INSTRUÇÕES DE USO' as status;
SELECT 
    'Para sincronizar manualmente: SELECT manual_sync_all_users();' as instruction
UNION ALL
SELECT 
    'Para limpar nomes legíveis: SELECT cleanup_readable_names();' as instruction
UNION ALL
SELECT 
    'Triggers automáticos já configurados para novos logins' as instruction;
