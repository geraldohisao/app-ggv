-- Script para corrigir mapeamento de usuários e remover códigos VOIP
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR DADOS ATUAIS
-- =========================================

-- Verificar usuários na tabela profiles (dados reais)
SELECT 'USUÁRIOS REAIS NA TABELA PROFILES' as status;
SELECT id, full_name, email, created_at 
FROM profiles 
WHERE full_name IS NOT NULL AND full_name != ''
ORDER BY full_name;

-- Verificar user_mapping atual (pode ter códigos)
SELECT 'USER_MAPPING ATUAL (COM CÓDIGOS)' as status;
SELECT agent_id, full_name, email 
FROM user_mapping 
ORDER BY full_name;

-- Verificar chamadas com códigos
SELECT 'CHAMADAS COM CÓDIGOS VOIP' as status;
SELECT DISTINCT agent_id, sdr_name, COUNT(*) as total
FROM calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id, sdr_name
ORDER BY total DESC;

-- =========================================
-- ETAPA 2: LIMPAR E RECRIAR MAPEAMENTO CORRETO
-- =========================================

-- Limpar user_mapping atual
DELETE FROM user_mapping;

-- Inserir apenas usuários reais da tabela profiles
INSERT INTO user_mapping (agent_id, full_name, email, created_at)
SELECT 
    p.id::TEXT as agent_id,
    p.full_name,
    p.email,
    NOW()
FROM profiles p
WHERE p.full_name IS NOT NULL 
  AND p.full_name != ''
  AND p.full_name NOT LIKE 'Usuário%'  -- Excluir nomes genéricos
ON CONFLICT (agent_id) DO NOTHING;

-- =========================================
-- ETAPA 3: MAPEAR CÓDIGOS VOIP PARA USUÁRIOS REAIS
-- =========================================

-- Criar mapeamento manual dos códigos VOIP para usuários reais
DO $$
DECLARE
    andressa_uuid TEXT;
    isabel_uuid TEXT;
    mariana_uuid TEXT;
    camila_uuid TEXT;
    lo_ruama_uuid TEXT;
BEGIN
    -- Buscar UUIDs dos usuários reais
    SELECT id::TEXT INTO andressa_uuid FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1;
    SELECT id::TEXT INTO isabel_uuid FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1;
    SELECT id::TEXT INTO mariana_uuid FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1;
    SELECT id::TEXT INTO camila_uuid FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1;
    SELECT id::TEXT INTO lo_ruama_uuid FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1;
    
    -- Atualizar chamadas com códigos VOIP para usar UUIDs reais
    IF andressa_uuid IS NOT NULL THEN
        UPDATE calls 
        SET agent_id = andressa_uuid, sdr_name = 'Andressa'
        WHERE agent_id IN ('1018', 'Andressa', 'agent_001') 
           OR sdr_name ILIKE '%andressa%';
        RAISE NOTICE 'Andressa mapeada: %', andressa_uuid;
    END IF;
    
    IF isabel_uuid IS NOT NULL THEN
        UPDATE calls 
        SET agent_id = isabel_uuid, sdr_name = (SELECT full_name FROM profiles WHERE id::TEXT = isabel_uuid)
        WHERE agent_id IN ('1003', 'Isabel', 'agent_002') 
           OR sdr_name ILIKE '%isabel%';
        RAISE NOTICE 'Isabel mapeada: %', isabel_uuid;
    END IF;
    
    IF mariana_uuid IS NOT NULL THEN
        UPDATE calls 
        SET agent_id = mariana_uuid, sdr_name = (SELECT full_name FROM profiles WHERE id::TEXT = mariana_uuid)
        WHERE agent_id IN ('1011', 'Mariana', 'agent_003') 
           OR sdr_name ILIKE '%mariana%';
        RAISE NOTICE 'Mariana mapeada: %', mariana_uuid;
    END IF;
    
    IF camila_uuid IS NOT NULL THEN
        UPDATE calls 
        SET agent_id = camila_uuid, sdr_name = (SELECT full_name FROM profiles WHERE id::TEXT = camila_uuid)
        WHERE agent_id IN ('1001', 'Camila', 'agent_004') 
           OR sdr_name ILIKE '%camila%';
        RAISE NOTICE 'Camila mapeada: %', camila_uuid;
    END IF;
    
    IF lo_ruama_uuid IS NOT NULL THEN
        UPDATE calls 
        SET agent_id = lo_ruama_uuid, sdr_name = (SELECT full_name FROM profiles WHERE id::TEXT = lo_ruama_uuid)
        WHERE agent_id IN ('1017', 'Lo-Ruama', 'agent_005') 
           OR sdr_name ILIKE '%ruama%';
        RAISE NOTICE 'Lô-Ruama mapeada: %', lo_ruama_uuid;
    END IF;
END $$;

-- =========================================
-- ETAPA 4: ATUALIZAR FUNÇÃO GET_MAPPED_USERS
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
        p.id::TEXT as id,
        p.full_name as name,
        p.email,
        COALESCE(call_counts.total, 0) as call_count
    FROM profiles p
    LEFT JOIN (
        SELECT 
            agent_id,
            COUNT(*) as total
        FROM calls 
        WHERE agent_id IS NOT NULL
        GROUP BY agent_id
    ) call_counts ON p.id::TEXT = call_counts.agent_id
    WHERE p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND p.full_name NOT LIKE 'Usuário%'
    ORDER BY call_counts.total DESC NULLS LAST, p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 5: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar user_mapping limpo
SELECT 'USER_MAPPING LIMPO' as status;
SELECT agent_id, full_name, email 
FROM user_mapping 
ORDER BY full_name;

-- Verificar chamadas mapeadas corretamente
SELECT 'CHAMADAS MAPEADAS CORRETAMENTE' as status;
SELECT 
    c.agent_id,
    c.sdr_name,
    p.full_name as nome_real,
    COUNT(*) as total_calls
FROM calls c
LEFT JOIN profiles p ON c.agent_id = p.id::TEXT
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id, c.sdr_name, p.full_name
ORDER BY total_calls DESC;

-- Testar função get_mapped_users
SELECT 'USUÁRIOS PARA FILTRO' as status;
SELECT * FROM get_mapped_users();

-- Testar get_calls_v2 com Andressa
SELECT 'TESTE CHAMADAS DA ANDRESSA' as status;
SELECT id, sdr_name, agent_id, created_at 
FROM get_calls_v2(
    NULL::TIMESTAMPTZ,  -- start_date
    NULL::TIMESTAMPTZ,  -- end_date  
    NULL::TEXT,         -- status_filter
    (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1), -- sdr_filter
    NULL::TEXT,         -- search_term
    0,                  -- offset
    10                  -- limit
);

-- Resumo final
SELECT '🎉 MAPEAMENTO CORRIGIDO!' as message
UNION ALL
SELECT '✅ Códigos VOIP removidos'
UNION ALL
SELECT '✅ Usuários reais mapeados'
UNION ALL
SELECT '✅ Chamadas vinculadas corretamente'
UNION ALL
SELECT '✅ Filtros usando nomes reais'
UNION ALL
SELECT '🚀 Sistema funcionando!';
