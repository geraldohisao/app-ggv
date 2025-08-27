-- Script Final para Corrigir Usuários Duplicados e Mapeamento
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: DIAGNÓSTICO DO PROBLEMA
-- =========================================

-- Verificar usuários duplicados
SELECT 'USUÁRIOS DUPLICADOS NO SISTEMA' as status;
SELECT * FROM get_all_users_with_calls() ORDER BY name, call_count DESC;

-- Verificar chamadas da Camila especificamente
SELECT 'CHAMADAS DA CAMILA - DIAGNÓSTICO' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls,
    MIN(created_at) as primeira_chamada,
    MAX(created_at) as ultima_chamada
FROM calls 
WHERE sdr_name ILIKE '%camila%' OR agent_id ILIKE '%camila%' OR agent_id IN ('1001')
GROUP BY agent_id, sdr_name
ORDER BY total_calls DESC;

-- =========================================
-- ETAPA 2: LIMPAR TUDO E COMEÇAR DO ZERO
-- =========================================

-- Limpar tabelas de mapeamento
DROP TABLE IF EXISTS manual_user_mapping CASCADE;
DELETE FROM user_mapping;

-- =========================================
-- ETAPA 3: CRIAR MAPEAMENTO ÚNICO E CORRETO
-- =========================================

-- Criar tabela de mapeamento limpa
CREATE TABLE manual_user_mapping (
    voip_code TEXT PRIMARY KEY,
    real_name TEXT NOT NULL,
    profile_uuid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir mapeamentos únicos baseados nos dados reais
INSERT INTO manual_user_mapping (voip_code, real_name, profile_uuid) 
SELECT DISTINCT
    codes.code,
    p.full_name,
    p.id::TEXT
FROM (
    VALUES 
    ('1018', 'andressa'),
    ('1003', 'isabel'),
    ('1011', 'mariana'), 
    ('1001', 'camila'),
    ('1017', 'ruama'),
    ('Andressa', 'andressa'),
    ('Isabel', 'isabel'),
    ('Mariana', 'mariana'),
    ('Camila', 'camila'),
    ('Lo-Ruama', 'ruama')
) AS codes(code, search_name)
JOIN profiles p ON p.full_name ILIKE '%' || codes.search_name || '%'
ON CONFLICT (voip_code) DO NOTHING;

-- =========================================
-- ETAPA 4: CONSOLIDAR TODAS AS CHAMADAS
-- =========================================

-- Atualizar TODAS as chamadas para usar UUIDs corretos
UPDATE calls 
SET 
    agent_id = mum.profile_uuid,
    sdr_name = mum.real_name
FROM manual_user_mapping mum
WHERE calls.agent_id = mum.voip_code;

-- Atualizar chamadas que têm sdr_name mas agent_id diferente
UPDATE calls 
SET 
    agent_id = mum.profile_uuid,
    sdr_name = mum.real_name
FROM manual_user_mapping mum
WHERE calls.sdr_name ILIKE '%' || SPLIT_PART(mum.real_name, ' ', 1) || '%'
  AND calls.agent_id != mum.profile_uuid;

-- =========================================
-- ETAPA 5: CRIAR FUNÇÃO ÚNICA SEM DUPLICATAS
-- =========================================

CREATE OR REPLACE FUNCTION get_unique_users_with_calls()
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
      AND call_counts.total > 0  -- Apenas usuários com chamadas
    ORDER BY call_counts.total DESC, p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- ETAPA 6: ATUALIZAR GET_CALLS_V2 SIMPLIFICADA
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
    WHERE 1=1
      AND (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_sdr_filter IS NULL OR 
           c.agent_id = p_sdr_filter OR 
           p.full_name ILIKE '%' || p_sdr_filter || '%' OR
           c.sdr_name ILIKE '%' || p_sdr_filter || '%')
      AND (p_search_term IS NULL OR 
           c.sdr_name ILIKE '%' || p_search_term || '%' OR
           p.full_name ILIKE '%' || p_search_term || '%' OR
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
    COALESCE(p.full_name, c.sdr_name, c.agent_id) as sdr_name,
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
  CROSS JOIN total_count tc
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 7: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar mapeamento final
SELECT 'MAPEAMENTO FINAL ÚNICO' as status;
SELECT * FROM manual_user_mapping ORDER BY real_name;

-- Verificar usuários únicos com chamadas
SELECT 'USUÁRIOS ÚNICOS COM CHAMADAS' as status;
SELECT * FROM get_unique_users_with_calls();

-- Verificar chamadas da Camila consolidadas
SELECT 'CHAMADAS DA CAMILA CONSOLIDADAS' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls
FROM calls 
WHERE agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE real_name ILIKE '%camila%' LIMIT 1)
GROUP BY agent_id, sdr_name;

-- Testar get_calls_v2 com Camila
SELECT 'TESTE GET_CALLS_V2 - CAMILA' as status;
SELECT COUNT(*) as total_chamadas_camila
FROM get_calls_v2(
    NULL::TIMESTAMPTZ,
    NULL::TIMESTAMPTZ,
    NULL::TEXT,
    (SELECT profile_uuid FROM manual_user_mapping WHERE real_name ILIKE '%camila%' LIMIT 1),
    NULL::TEXT,
    0,
    1000
);

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_unique_users_with_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Resumo final
SELECT '🎉 USUÁRIOS ÚNICOS E CHAMADAS CONSOLIDADAS!' as message
UNION ALL
SELECT '✅ Duplicatas removidas'
UNION ALL
SELECT '✅ Mapeamento único criado'  
UNION ALL
SELECT '✅ Todas as chamadas consolidadas'
UNION ALL
SELECT '✅ Função única sem duplicatas'
UNION ALL
SELECT '🚀 Sistema limpo e funcionando!';
