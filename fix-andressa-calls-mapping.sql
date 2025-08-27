-- Script para verificar e corrigir o mapeamento das ligações da Andressa
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR DADOS DA ANDRESSA
-- =========================================

-- Verificar se a Andressa está na tabela profiles
SELECT 'VERIFICANDO ANDRESSA NA TABELA PROFILES' as status;
SELECT id, full_name, email, created_at 
FROM profiles 
WHERE full_name ILIKE '%andressa%' OR email ILIKE '%andressa%'
ORDER BY created_at DESC;

-- Verificar se a Andressa está na tabela user_mapping
SELECT 'VERIFICANDO ANDRESSA NA TABELA USER_MAPPING' as status;
SELECT agent_id, full_name, email, created_at 
FROM user_mapping 
WHERE full_name ILIKE '%andressa%' OR agent_id ILIKE '%andressa%'
ORDER BY created_at DESC;

-- Verificar ligações da Andressa na tabela calls
SELECT 'VERIFICANDO LIGAÇÕES DA ANDRESSA NA TABELA CALLS' as status;
SELECT 
    id,
    agent_id,
    sdr_name,
    sdr_id,
    status,
    created_at
FROM calls 
WHERE sdr_name ILIKE '%andressa%' 
   OR agent_id ILIKE '%andressa%'
   OR sdr_id::TEXT ILIKE '%andressa%'
ORDER BY created_at DESC
LIMIT 10;

-- =========================================
-- ETAPA 2: MAPEAR ANDRESSA CORRETAMENTE
-- =========================================

-- Primeiro, vamos obter o ID da Andressa da tabela profiles
DO $$
DECLARE
    andressa_uuid UUID;
    andressa_id TEXT;
BEGIN
    -- Buscar UUID da Andressa na tabela profiles
    SELECT id INTO andressa_uuid
    FROM profiles 
    WHERE full_name ILIKE '%andressa%' 
    LIMIT 1;
    
    IF andressa_uuid IS NOT NULL THEN
        -- Converter UUID para TEXT
        andressa_id := andressa_uuid::TEXT;
        
        -- Inserir/atualizar na tabela user_mapping
        INSERT INTO user_mapping (
            agent_id,
            full_name,
            email,
            created_at
        )
        SELECT 
            andressa_id,
            p.full_name,
            p.email,
            now()
        FROM profiles p
        WHERE p.id = andressa_uuid
        ON CONFLICT (agent_id) 
        DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email;
        
        RAISE NOTICE '✅ Andressa mapeada com UUID: %', andressa_id;
        
        -- Atualizar chamadas da Andressa para usar o UUID correto
        UPDATE calls 
        SET 
            agent_id = andressa_id,
            sdr_name = 'Andressa'
        WHERE (sdr_name ILIKE '%andressa%' OR agent_id = 'Andressa')
          AND agent_id != andressa_id;
        
        RAISE NOTICE '✅ Chamadas da Andressa atualizadas para usar UUID: %', andressa_id;
    ELSE
        RAISE NOTICE '❌ Andressa não encontrada na tabela profiles';
    END IF;
END $$;

-- =========================================
-- ETAPA 3: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar mapeamento final da Andressa
SELECT 'VERIFICAÇÃO FINAL - ANDRESSA NO USER_MAPPING' as status;
SELECT agent_id, full_name, email 
FROM user_mapping 
WHERE full_name ILIKE '%andressa%' OR agent_id ILIKE '%andressa%';

-- Verificar ligações finais da Andressa
SELECT 'VERIFICAÇÃO FINAL - LIGAÇÕES DA ANDRESSA' as status;
SELECT 
    COUNT(*) as total_calls,
    agent_id,
    sdr_name,
    MIN(created_at) as primeira_chamada,
    MAX(created_at) as ultima_chamada
FROM calls 
WHERE agent_id IN (
    SELECT agent_id FROM user_mapping WHERE full_name ILIKE '%andressa%'
) OR sdr_name ILIKE '%andressa%'
GROUP BY agent_id, sdr_name;

-- Verificar se as ligações aparecem corretamente na função get_calls_v2
SELECT 'VERIFICAÇÃO FINAL - GET_CALLS_V2 ANDRESSA' as status;
SELECT * FROM get_calls_v2(
    null, -- start_date
    null, -- end_date  
    null, -- status_filter
    (SELECT agent_id FROM user_mapping WHERE full_name ILIKE '%andressa%' LIMIT 1), -- sdr_filter (usando UUID da Andressa)
    null, -- search_term
    0,    -- offset_val
    10    -- limit_val
);

-- Resumo final
SELECT '🎉 MAPEAMENTO DA ANDRESSA CORRIGIDO!' as message
UNION ALL
SELECT '✅ UUID da Andressa obtido da tabela profiles'
UNION ALL
SELECT '✅ Mapeamento atualizado no user_mapping'
UNION ALL
SELECT '✅ Chamadas vinculadas ao UUID correto'
UNION ALL
SELECT '🚀 Ligações da Andressa devem aparecer agora!';
