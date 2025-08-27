-- Sistema de Mapeamento Automático de Usuários
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: CRIAR FUNÇÃO PARA MAPEAR USUÁRIOS AUTOMATICAMENTE
-- =========================================

CREATE OR REPLACE FUNCTION auto_map_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o usuário já existe no user_mapping
    IF NOT EXISTS (
        SELECT 1 FROM user_mapping 
        WHERE agent_id = NEW.id OR full_name = NEW.full_name
    ) THEN
        -- Inserir novo usuário no user_mapping
        INSERT INTO user_mapping (
            agent_id,
            full_name,
            email,
            created_at
        ) VALUES (
            NEW.id::TEXT,
            COALESCE(NEW.full_name, NEW.email),
            NEW.email,
            now()
        )
        ON CONFLICT (agent_id) DO NOTHING;
        
        RAISE NOTICE '✅ Novo usuário mapeado automaticamente: %', NEW.full_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 2: CRIAR TRIGGER PARA DETECTAR NOVOS USUÁRIOS
-- =========================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_auto_map_new_user ON profiles;

-- Criar trigger para detectar novos usuários
CREATE TRIGGER trigger_auto_map_new_user
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_map_new_user();

-- =========================================
-- ETAPA 3: CRIAR FUNÇÃO PARA MAPEAR USUÁRIOS EXISTENTES
-- =========================================

CREATE OR REPLACE FUNCTION map_existing_users()
RETURNS TABLE(
    result_agent_id TEXT,
    result_full_name TEXT,
    result_email TEXT,
    result_status TEXT
) AS $$
DECLARE
    profile_record RECORD;
BEGIN
    -- Mapear todos os usuários existentes na tabela profiles
    FOR profile_record IN 
        SELECT p.id, p.full_name, p.email 
        FROM profiles p
        WHERE p.full_name IS NOT NULL
    LOOP
        -- Verificar se já existe no user_mapping
        IF NOT EXISTS (
            SELECT 1 FROM user_mapping um
            WHERE um.agent_id = profile_record.id::TEXT
        ) THEN
            -- Inserir no user_mapping
            INSERT INTO user_mapping (
                agent_id,
                full_name,
                email,
                created_at
            ) VALUES (
                profile_record.id::TEXT,
                profile_record.full_name,
                profile_record.email,
                now()
            )
            ON CONFLICT (agent_id) DO NOTHING;
            
            -- Retornar status de sucesso
            result_agent_id := profile_record.id::TEXT;
            result_full_name := profile_record.full_name;
            result_email := profile_record.email;
            result_status := '✅ Mapeado com sucesso';
            RETURN NEXT;
        ELSE
            -- Retornar status de já existente
            result_agent_id := profile_record.id::TEXT;
            result_full_name := profile_record.full_name;
            result_email := profile_record.email;
            result_status := 'ℹ️ Já mapeado';
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 4: CRIAR FUNÇÃO PARA SINCRONIZAR CHAMADAS
-- =========================================

CREATE OR REPLACE FUNCTION sync_calls_with_users()
RETURNS TABLE(
    result_call_id BIGINT,
    result_agent_id TEXT,
    result_old_sdr_name TEXT,
    result_new_sdr_name TEXT,
    result_status TEXT
) AS $$
DECLARE
    call_record RECORD;
    user_name TEXT;
BEGIN
    -- Atualizar chamadas com nomes corretos dos usuários
    FOR call_record IN 
        SELECT c.id, c.agent_id, c.sdr_name, um.full_name
        FROM calls c
        LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
        WHERE c.agent_id IS NOT NULL
    LOOP
        -- Obter nome correto do usuário
        SELECT COALESCE(um.full_name, p.full_name, call_record.agent_id)
        INTO user_name
        FROM user_mapping um
        FULL OUTER JOIN profiles p ON um.agent_id = p.id
        WHERE um.agent_id = call_record.agent_id OR p.id = call_record.agent_id
        LIMIT 1;
        
        -- Se encontrou um nome diferente, atualizar
        IF user_name IS NOT NULL AND user_name != call_record.sdr_name THEN
            UPDATE calls 
            SET sdr_name = user_name
            WHERE id = call_record.id;
            
            -- Retornar status de atualização
            result_call_id := call_record.id;
            result_agent_id := call_record.agent_id;
            result_old_sdr_name := call_record.sdr_name;
            result_new_sdr_name := user_name;
            result_status := '🔄 Atualizado';
            RETURN NEXT;
        ELSE
            -- Retornar status de já correto
            result_call_id := call_record.id;
            result_agent_id := call_record.agent_id;
            result_old_sdr_name := call_record.sdr_name;
            result_new_sdr_name := call_record.sdr_name;
            result_status := '✅ Já correto';
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 5: EXECUTAR MAPEAMENTO INICIAL
-- =========================================

-- Mapear usuários existentes
SELECT 'MAPEANDO USUÁRIOS EXISTENTES...' as status;
SELECT * FROM map_existing_users();

-- Sincronizar chamadas
SELECT 'SINCRONIZANDO CHAMADAS...' as status;
SELECT * FROM sync_calls_with_users() LIMIT 10;

-- =========================================
-- ETAPA 6: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar usuários mapeados
SELECT 'VERIFICAÇÃO FINAL - USUÁRIOS MAPEADOS' as status;
SELECT 
    agent_id,
    full_name,
    email,
    created_at
FROM user_mapping 
ORDER BY created_at DESC
LIMIT 10;

-- Verificar chamadas com nomes corretos
SELECT 'VERIFICAÇÃO FINAL - CHAMADAS' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls
FROM calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id, sdr_name
ORDER BY total_calls DESC
LIMIT 10;

-- Resumo final
SELECT '🎉 SISTEMA DE MAPEAMENTO AUTOMÁTICO ATIVADO!' as message
UNION ALL
SELECT '✅ Trigger criado para novos usuários'
UNION ALL
SELECT '✅ Função para mapear usuários existentes'
UNION ALL
SELECT '✅ Função para sincronizar chamadas'
UNION ALL
SELECT '✅ Mapeamento inicial executado'
UNION ALL
SELECT '🚀 Sistema automático pronto!';
