-- Script para corrigir nomes NULL na tabela profiles
-- Execute este script no Supabase SQL Editor

-- 1. Verificar usuários com full_name NULL
SELECT 'USUÁRIOS COM NOME NULL' as status;
SELECT 
    id,
    full_name,
    email,
    role
FROM public.profiles 
WHERE full_name IS NULL;

-- 2. Atualizar nomes NULL com email ou ID
UPDATE public.profiles 
SET full_name = COALESCE(
    email,
    'Usuário ' || SUBSTRING(id::TEXT, 1, 8)
)
WHERE full_name IS NULL;

-- 3. Verificar se ainda há nomes NULL
SELECT 'VERIFICANDO SE AINDA HÁ NOMES NULL' as status;
SELECT 
    id,
    full_name,
    email,
    role
FROM public.profiles 
WHERE full_name IS NULL;

-- 4. Corrigir a função manual_sync_all_users
CREATE OR REPLACE FUNCTION manual_sync_all_users()
RETURNS void AS $$
BEGIN
    -- Sincronizar todos os usuários da tabela profiles que têm ligações
    INSERT INTO public.user_mapping (agent_id, full_name, role, email)
    SELECT DISTINCT 
        p.id::TEXT,
        COALESCE(p.full_name, p.email, 'Usuário ' || SUBSTRING(p.id::TEXT, 1, 8)) as full_name,
        COALESCE(p.role, 'user') as role,
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

-- 5. Corrigir a função auto_sync_new_users
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
            VALUES (
                NEW.id::TEXT, 
                COALESCE(NEW.full_name, NEW.email, 'Usuário ' || SUBSTRING(NEW.id::TEXT, 1, 8)),
                COALESCE(NEW.role, 'user'), 
                NEW.email
            )
            ON CONFLICT (agent_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                email = EXCLUDED.email;
                
            RAISE NOTICE 'Novo usuário % sincronizado automaticamente', COALESCE(NEW.full_name, NEW.email);
        END IF;
    END IF;
    
    -- Se é uma atualização de usuário existente
    IF TG_OP = 'UPDATE' THEN
        -- Atualizar na tabela user_mapping se existir
        UPDATE public.user_mapping 
        SET full_name = COALESCE(NEW.full_name, NEW.email, 'Usuário ' || SUBSTRING(NEW.id::TEXT, 1, 8)),
            role = COALESCE(NEW.role, 'user'),
            email = NEW.email
        WHERE agent_id = NEW.id::TEXT;
        
        RAISE NOTICE 'Usuário % atualizado automaticamente', COALESCE(NEW.full_name, NEW.email);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Testar a função manual corrigida
SELECT manual_sync_all_users();

-- 7. Verificar resultado
SELECT 'RESULTADO FINAL' as status;
SELECT 
    agent_id,
    full_name,
    role,
    email
FROM public.user_mapping 
ORDER BY full_name;

-- 8. Verificar estatísticas
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name NOT LIKE '%(sem perfil)' AND full_name NOT LIKE '%...' AND full_name NOT LIKE 'Usuário %' THEN 1 END) as named_users,
    COUNT(CASE WHEN full_name LIKE '%(sem perfil)' OR full_name LIKE '%...' OR full_name LIKE 'Usuário %' THEN 1 END) as readable_names
FROM public.user_mapping 
GROUP BY role
ORDER BY role;
