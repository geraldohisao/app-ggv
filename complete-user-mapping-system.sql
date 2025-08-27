-- Sistema Completo de Mapeamento Automático de Usuários
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR E CRIAR TABELA USER_MAPPING
-- =========================================

-- Criar tabela user_mapping se não existir
CREATE TABLE IF NOT EXISTS user_mapping (
    agent_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_mapping_full_name ON user_mapping(full_name);
CREATE INDEX IF NOT EXISTS idx_user_mapping_email ON user_mapping(email);

-- =========================================
-- ETAPA 2: ADICIONAR COLUNAS NECESSÁRIAS NA TABELA CALLS
-- =========================================

-- Adicionar colunas sdr_name e sdr_email se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'sdr_name') THEN
        ALTER TABLE calls ADD COLUMN sdr_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'sdr_email') THEN
        ALTER TABLE calls ADD COLUMN sdr_email TEXT;
    END IF;
END $$;

-- =========================================
-- ETAPA 3: FUNÇÃO PARA MAPEAR USUÁRIO AUTOMATICAMENTE
-- =========================================

CREATE OR REPLACE FUNCTION auto_map_user_on_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir usuário no user_mapping quando fizer login
    INSERT INTO user_mapping (
        agent_id,
        full_name,
        email,
        created_at
    ) VALUES (
        NEW.id::TEXT,
        COALESCE(NEW.full_name, NEW.email, 'Usuário'),
        NEW.email,
        NOW()
    )
    ON CONFLICT (agent_id) 
    DO UPDATE SET 
        full_name = COALESCE(EXCLUDED.full_name, user_mapping.full_name),
        email = COALESCE(EXCLUDED.email, user_mapping.email);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 4: TRIGGER PARA DETECTAR NOVOS USUÁRIOS
-- =========================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_auto_map_user ON profiles;

-- Criar trigger para detectar novos usuários
CREATE TRIGGER trigger_auto_map_user
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_map_user_on_login();

-- =========================================
-- ETAPA 5: FUNÇÃO PARA SINCRONIZAR USUÁRIOS EXISTENTES
-- =========================================

CREATE OR REPLACE FUNCTION sync_existing_users()
RETURNS TABLE(
    user_id TEXT,
    user_name TEXT,
    user_email TEXT,
    action_taken TEXT
) AS $$
DECLARE
    profile_record RECORD;
BEGIN
    -- Sincronizar todos os usuários existentes da tabela profiles
    FOR profile_record IN 
        SELECT p.id, p.full_name, p.email 
        FROM profiles p
        WHERE p.full_name IS NOT NULL OR p.email IS NOT NULL
    LOOP
        -- Inserir/atualizar no user_mapping
        INSERT INTO user_mapping (
            agent_id,
            full_name,
            email,
            created_at
        ) VALUES (
            profile_record.id::TEXT,
            COALESCE(profile_record.full_name, profile_record.email, 'Usuário'),
            profile_record.email,
            NOW()
        )
        ON CONFLICT (agent_id) 
        DO UPDATE SET 
            full_name = COALESCE(EXCLUDED.full_name, user_mapping.full_name),
            email = COALESCE(EXCLUDED.email, user_mapping.email);
        
        -- Retornar resultado
        user_id := profile_record.id::TEXT;
        user_name := COALESCE(profile_record.full_name, profile_record.email, 'Usuário');
        user_email := profile_record.email;
        action_taken := '✅ Sincronizado';
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 6: FUNÇÃO PARA ATUALIZAR CHAMADAS COM NOMES CORRETOS
-- =========================================

CREATE OR REPLACE FUNCTION update_calls_with_user_names()
RETURNS TABLE(
    call_id UUID,
    old_agent_id TEXT,
    new_agent_id TEXT,
    old_sdr_name TEXT,
    new_sdr_name TEXT,
    status_update TEXT
) AS $$
DECLARE
    call_record RECORD;
    mapped_user RECORD;
BEGIN
    -- Atualizar chamadas com informações corretas dos usuários
    FOR call_record IN 
        SELECT c.id, c.agent_id, c.sdr_name, c.sdr_email
        FROM calls c
        WHERE c.agent_id IS NOT NULL
    LOOP
        -- Buscar usuário mapeado
        SELECT um.agent_id, um.full_name, um.email
        INTO mapped_user
        FROM user_mapping um
        WHERE um.agent_id = call_record.agent_id
           OR um.full_name = call_record.sdr_name
           OR um.email = call_record.sdr_email
        LIMIT 1;
        
        -- Se encontrou usuário mapeado, atualizar chamada
        IF mapped_user IS NOT NULL THEN
            UPDATE calls 
            SET 
                agent_id = mapped_user.agent_id,
                sdr_name = mapped_user.full_name,
                sdr_email = mapped_user.email
            WHERE id = call_record.id;
            
            -- Retornar resultado
            call_id := call_record.id;
            old_agent_id := call_record.agent_id;
            new_agent_id := mapped_user.agent_id;
            old_sdr_name := call_record.sdr_name;
            new_sdr_name := mapped_user.full_name;
            status_update := '🔄 Atualizado';
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 7: FUNÇÃO PARA BUSCAR USUÁRIOS PARA FILTROS
-- =========================================

CREATE OR REPLACE FUNCTION get_mapped_users()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    call_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        um.agent_id as id,
        um.full_name as name,
        um.email,
        COALESCE(call_counts.total, 0) as call_count
    FROM user_mapping um
    LEFT JOIN (
        SELECT 
            agent_id,
            COUNT(*) as total
        FROM calls 
        WHERE agent_id IS NOT NULL
        GROUP BY agent_id
    ) call_counts ON um.agent_id = call_counts.agent_id
    ORDER BY call_counts.total DESC NULLS LAST, um.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 8: ATUALIZAR FUNÇÃO GET_CALLS_V2 PARA USAR TEXT
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_v2(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_sdr_filter TEXT DEFAULT NULL,  -- Mudado para TEXT
    p_search_term TEXT DEFAULT NULL,
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    company TEXT,
    deal_id TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    transcription TEXT,
    transcript_status TEXT,
    ai_status TEXT,
    insights JSONB,
    scorecard JSONB,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_calls AS (
    SELECT c.*
    FROM calls c
    LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
    WHERE 1=1
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_sdr_filter IS NULL OR c.agent_id = p_sdr_filter OR um.full_name ILIKE '%' || p_sdr_filter || '%')
      AND (p_search_term IS NULL OR 
           c.sdr_name ILIKE '%' || p_search_term || '%' OR
           um.full_name ILIKE '%' || p_search_term || '%' OR
           c.from_number ILIKE '%' || p_search_term || '%' OR
           c.to_number ILIKE '%' || p_search_term || '%')
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_calls
  )
  SELECT 
    c.id,
    c.provider_call_id,
    COALESCE(c.deal_id, 'N/A') as company,
    c.deal_id,
    c.sdr_id,
    COALESCE(um.full_name, c.sdr_name, c.agent_id) as sdr_name,
    COALESCE(um.email, c.sdr_email) as sdr_email,
    c.status,
    c.duration,
    c.call_type,
    c.direction,
    c.recording_url,
    c.audio_bucket,
    c.audio_path,
    c.transcription,
    c.transcript_status,
    c.ai_status,
    c.insights,
    c.scorecard,
    c.from_number,
    c.to_number,
    c.agent_id,
    c.created_at,
    c.updated_at,
    c.processed_at,
    tc.count as total_count
  FROM filtered_calls c
  LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
  CROSS JOIN total_count tc
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 9: EXECUTAR SINCRONIZAÇÃO INICIAL
-- =========================================

-- Sincronizar usuários existentes
SELECT 'SINCRONIZANDO USUÁRIOS EXISTENTES...' as status;
SELECT * FROM sync_existing_users();

-- Atualizar chamadas com nomes corretos
SELECT 'ATUALIZANDO CHAMADAS...' as status;
SELECT * FROM update_calls_with_user_names();

-- =========================================
-- ETAPA 10: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar usuários mapeados
SELECT 'USUÁRIOS MAPEADOS' as status;
SELECT * FROM get_mapped_users() LIMIT 10;

-- Verificar chamadas com nomes corretos
SELECT 'CHAMADAS ATUALIZADAS' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls
FROM calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id, sdr_name
ORDER BY total_calls DESC
LIMIT 10;

-- Testar função get_calls_v2 com parâmetros corretos
SELECT 'TESTE GET_CALLS_V2' as status;
SELECT id, sdr_name, agent_id, created_at 
FROM get_calls_v2(
    NULL::TIMESTAMPTZ,  -- start_date
    NULL::TIMESTAMPTZ,  -- end_date  
    NULL::TEXT,         -- status_filter
    NULL::TEXT,         -- sdr_filter
    NULL::TEXT,         -- search_term
    0,                  -- offset
    5                   -- limit
) LIMIT 5;

-- =========================================
-- ETAPA 11: PERMISSÕES
-- =========================================

-- Dar permissões para as funções
GRANT EXECUTE ON FUNCTION sync_existing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_calls_with_user_names() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mapped_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Resumo final
SELECT '🎉 SISTEMA DE MAPEAMENTO AUTOMÁTICO COMPLETO!' as message
UNION ALL
SELECT '✅ Trigger criado para novos usuários'
UNION ALL
SELECT '✅ Funções de sincronização criadas'
UNION ALL
SELECT '✅ Função get_calls_v2 atualizada'
UNION ALL
SELECT '✅ Usuários existentes sincronizados'
UNION ALL
SELECT '✅ Chamadas atualizadas'
UNION ALL
SELECT '🚀 Sistema 100% automático ativo!';
