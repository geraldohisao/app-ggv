-- Debug Completo do Sistema de Mapeamento
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: DIAGNÓSTICO COMPLETO
-- =========================================

-- 1. Verificar usuários na tabela profiles
SELECT 'USUÁRIOS NA TABELA PROFILES' as status;
SELECT id, full_name, email, created_at FROM profiles ORDER BY full_name;

-- 2. Verificar user_mapping atual
SELECT 'USER_MAPPING ATUAL' as status;
SELECT agent_id, full_name, email FROM user_mapping ORDER BY full_name;

-- 3. Verificar chamadas na tabela calls
SELECT 'CHAMADAS NA TABELA CALLS' as status;
SELECT DISTINCT agent_id, sdr_name, COUNT(*) as total
FROM calls 
GROUP BY agent_id, sdr_name
ORDER BY total DESC;

-- 4. Testar função get_mapped_users
SELECT 'TESTE GET_MAPPED_USERS' as status;
SELECT * FROM get_mapped_users();

-- =========================================
-- ETAPA 2: CRIAR MAPEAMENTO ROBUSTO
-- =========================================

-- Criar tabela de mapeamento manual se necessário
CREATE TABLE IF NOT EXISTS manual_user_mapping (
    voip_code TEXT PRIMARY KEY,
    real_name TEXT NOT NULL,
    profile_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir mapeamentos manuais conhecidos
INSERT INTO manual_user_mapping (voip_code, real_name, profile_id) VALUES
('1018', 'Andressa', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1)),
('1003', 'Isabel Pestilho', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1)),
('1011', 'Mariana', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1)),
('1001', 'Camila Ataliba', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1)),
('1017', 'Lô-Ruama Oliveira', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1)),
('Andressa', 'Andressa', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1)),
('Isabel', 'Isabel Pestilho', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1)),
('Mariana', 'Mariana', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1)),
('Camila', 'Camila Ataliba', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1)),
('Lo-Ruama', 'Lô-Ruama Oliveira', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1))
ON CONFLICT (voip_code) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    profile_id = EXCLUDED.profile_id;

-- =========================================
-- ETAPA 3: ATUALIZAR CHAMADAS COM MAPEAMENTO ROBUSTO
-- =========================================

-- Atualizar chamadas usando o mapeamento manual
UPDATE calls 
SET 
    agent_id = mum.profile_id,
    sdr_name = mum.real_name
FROM manual_user_mapping mum
WHERE calls.agent_id = mum.voip_code OR calls.sdr_name = mum.voip_code;

-- Atualizar chamadas que têm nomes similares
UPDATE calls 
SET 
    agent_id = p.id::TEXT,
    sdr_name = p.full_name
FROM profiles p
WHERE calls.sdr_name ILIKE '%' || SPLIT_PART(p.full_name, ' ', 1) || '%'
  AND calls.agent_id NOT IN (SELECT id::TEXT FROM profiles);

-- =========================================
-- ETAPA 4: CRIAR FUNÇÃO ROBUSTA PARA USUÁRIOS
-- =========================================

CREATE OR REPLACE FUNCTION get_all_users_with_calls()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    call_count BIGINT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Usuários da tabela profiles com chamadas
    SELECT 
        p.id::TEXT as id,
        p.full_name as name,
        p.email,
        COALESCE(call_counts.total, 0) as call_count,
        'profiles' as source
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
    
    UNION ALL
    
    -- Usuários do mapeamento manual com chamadas
    SELECT 
        COALESCE(mum.profile_id, mum.voip_code) as id,
        mum.real_name as name,
        p.email,
        COALESCE(call_counts.total, 0) as call_count,
        'manual_mapping' as source
    FROM manual_user_mapping mum
    LEFT JOIN profiles p ON mum.profile_id = p.id::TEXT
    LEFT JOIN (
        SELECT 
            agent_id,
            COUNT(*) as total
        FROM calls 
        WHERE agent_id IS NOT NULL
        GROUP BY agent_id
    ) call_counts ON COALESCE(mum.profile_id, mum.voip_code) = call_counts.agent_id
    WHERE call_counts.total > 0
    
    ORDER BY call_count DESC NULLS LAST, name ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 5: ATUALIZAR GET_CALLS_V2 PARA SER MAIS FLEXÍVEL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_v2(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_sdr_filter TEXT DEFAULT NULL,
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
    LEFT JOIN profiles p ON c.agent_id = p.id::TEXT
    LEFT JOIN manual_user_mapping mum ON c.agent_id = mum.voip_code OR c.agent_id = mum.profile_id
    WHERE 1=1
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_sdr_filter IS NULL OR 
           c.agent_id = p_sdr_filter OR 
           p.id::TEXT = p_sdr_filter OR
           p.full_name ILIKE '%' || p_sdr_filter || '%' OR
           mum.real_name ILIKE '%' || p_sdr_filter || '%' OR
           c.sdr_name ILIKE '%' || p_sdr_filter || '%')
      AND (p_search_term IS NULL OR 
           c.sdr_name ILIKE '%' || p_search_term || '%' OR
           p.full_name ILIKE '%' || p_search_term || '%' OR
           mum.real_name ILIKE '%' || p_search_term || '%' OR
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
    COALESCE(p.full_name, mum.real_name, c.sdr_name, c.agent_id) as sdr_name,
    COALESCE(p.email, c.sdr_email) as sdr_email,
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
  LEFT JOIN profiles p ON c.agent_id = p.id::TEXT
  LEFT JOIN manual_user_mapping mum ON c.agent_id = mum.voip_code OR c.agent_id = mum.profile_id
  CROSS JOIN total_count tc
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 6: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar mapeamento manual
SELECT 'MAPEAMENTO MANUAL CRIADO' as status;
SELECT * FROM manual_user_mapping ORDER BY real_name;

-- Verificar usuários com chamadas
SELECT 'USUÁRIOS COM CHAMADAS' as status;
SELECT * FROM get_all_users_with_calls();

-- Testar chamadas da Andressa
SELECT 'TESTE CHAMADAS ANDRESSA' as status;
SELECT id, sdr_name, agent_id, created_at 
FROM get_calls_v2(
    NULL::TIMESTAMPTZ,
    NULL::TIMESTAMPTZ,
    NULL::TEXT,
    'Andressa',
    NULL::TEXT,
    0,
    5
);

-- Verificar todas as chamadas com nomes mapeados
SELECT 'CHAMADAS COM NOMES MAPEADOS' as status;
SELECT 
    c.agent_id,
    COALESCE(p.full_name, mum.real_name, c.sdr_name) as nome_final,
    COUNT(*) as total
FROM calls c
LEFT JOIN profiles p ON c.agent_id = p.id::TEXT
LEFT JOIN manual_user_mapping mum ON c.agent_id = mum.voip_code OR c.agent_id = mum.profile_id
GROUP BY c.agent_id, COALESCE(p.full_name, mum.real_name, c.sdr_name)
ORDER BY total DESC;

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_all_users_with_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

SELECT '🎉 MAPEAMENTO ROBUSTO CRIADO!' as message;
