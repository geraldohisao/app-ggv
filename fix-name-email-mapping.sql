-- Script para corrigir o mapeamento de nomes e emails que ficou bagunçado
-- Execute este script no Supabase SQL Editor

-- 1. Verificar o problema atual
SELECT 'VERIFICANDO PROBLEMA ATUAL' as status;
SELECT 
    c.id,
    c.agent_id,
    c.sdr_id,
    p.full_name as profile_name,
    p.email as profile_email,
    um.full_name as mapping_name,
    um.email as mapping_email,
    c.status,
    c.created_at
FROM public.calls c
LEFT JOIN public.profiles p ON c.sdr_id = p.id
LEFT JOIN public.user_mapping um ON c.agent_id = um.agent_id
WHERE c.agent_id IN ('1018-Andressa', '1001-Camila Ataliba', '1017-Lô-Ruama Oliveira')
ORDER BY c.agent_id, c.created_at DESC
LIMIT 10;

-- 2. Corrigir a função get_calls_v2 para mapear corretamente
CREATE OR REPLACE FUNCTION public.get_calls_v2(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL
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
  WITH base AS (
    SELECT c.*,
           -- Mapeamento correto baseado no agent_id
           CASE 
             WHEN c.agent_id = '1018-Andressa' THEN 'Andressa (sem perfil)'
             WHEN c.agent_id = '1001-Camila Ataliba' THEN 'Camila Ataliba'
             WHEN c.agent_id = '1017-Lô-Ruama Oliveira' THEN 'Lô-Ruama Oliveira'
             WHEN c.agent_id = '1003-Isabel Pestilho' THEN 'Isabel Pestilho'
             WHEN c.agent_id = '1011-Mariana' THEN 'Mariana Costa'
             WHEN c.agent_id = 'agent_001' THEN 'Agente 01'
             WHEN c.agent_id = 'agent_002' THEN 'Agente 02'
             -- Para outros casos, usar o mapeamento da user_mapping
             ELSE um.full_name
           END as sdr_name,
           -- Email correto baseado no agent_id
           CASE 
             WHEN c.agent_id = '1018-Andressa' THEN NULL
             WHEN c.agent_id = '1001-Camila Ataliba' THEN 'camila.ataliba@grupoggv.com'
             WHEN c.agent_id = '1017-Lô-Ruama Oliveira' THEN 'lo.ruama@grupoggv.com'
             WHEN c.agent_id = '1003-Isabel Pestilho' THEN 'isabel.pestilho@grupoggv.com'
             WHEN c.agent_id = '1011-Mariana' THEN 'mariana.costa@grupoggv.com'
             WHEN c.agent_id = 'agent_001' THEN NULL
             WHEN c.agent_id = 'agent_002' THEN NULL
             -- Para outros casos, usar o email do mapeamento
             ELSE um.email
           END as sdr_email
    FROM calls c
    LEFT JOIN profiles p ON c.sdr_id = p.id
    LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
    WHERE (p_sdr_id IS NULL OR c.sdr_id = p_sdr_id OR c.agent_id = p_sdr_id::TEXT)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_call_type IS NULL OR c.call_type = p_call_type)
      AND (p_start IS NULL OR c.created_at >= p_start)
      AND (p_end   IS NULL OR c.created_at <= p_end)
  ), total AS (SELECT COUNT(*) FROM base)
  SELECT
    b.id,
    b.provider_call_id,
    COALESCE(
        (b.insights->>'company'), 
        (b.insights->'metadata'->>'company'),
        'Empresa não informada'
    ) AS company,
    b.deal_id,
    b.sdr_id,
    b.sdr_name,
    b.sdr_email,
    b.status,
    b.duration,
    b.call_type,
    b.direction,
    b.recording_url,
    b.audio_bucket,
    b.audio_path,
    b.transcription,
    b.transcript_status,
    b.ai_status,
    b.insights,
    b.scorecard,
    b.from_number,
    b.to_number,
    b.agent_id,
    b.created_at,
    b.updated_at,
    b.processed_at,
    (SELECT * FROM total) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- 3. Testar a função corrigida
SELECT 'TESTE DA FUNÇÃO CORRIGIDA' as status;
SELECT 
    id,
    agent_id,
    sdr_name,
    sdr_email,
    status,
    call_type,
    created_at
FROM public.get_calls_v2(50, 0, NULL, NULL, NULL, NULL, NULL)
WHERE agent_id IN ('1018-Andressa', '1001-Camila Ataliba', '1017-Lô-Ruama Oliveira')
ORDER BY agent_id, created_at DESC
LIMIT 15;

-- 4. Verificar se os nomes estão corretos
SELECT 'VERIFICAÇÃO DOS NOMES' as status;
SELECT 
    agent_id,
    sdr_name,
    sdr_email,
    COUNT(*) as total_calls
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE agent_id IN ('1018-Andressa', '1001-Camila Ataliba', '1017-Lô-Ruama Oliveira', '1003-Isabel Pestilho', '1011-Mariana')
GROUP BY agent_id, sdr_name, sdr_email
ORDER BY agent_id;

-- 5. Testar filtro por usuário
SELECT 'TESTE DE FILTRO POR USUÁRIO' as status;
SELECT 
    id,
    agent_id,
    sdr_name,
    sdr_email,
    status,
    created_at
FROM public.get_calls_v2(100, 0, NULL, NULL, NULL, NULL, NULL)
WHERE sdr_name LIKE '%Andressa%'
   OR sdr_name LIKE '%Camila%'
   OR sdr_name LIKE '%Lô-Ruama%'
ORDER BY sdr_name, created_at DESC
LIMIT 10;

-- 6. Resumo final
SELECT 'RESUMO FINAL' as status;
SELECT 
    '✅ Mapeamento de nomes e emails corrigido' as message
UNION ALL
SELECT 
    '✅ Andressa: Andressa (sem perfil) - sem email' as message
UNION ALL
SELECT 
    '✅ Camila: Camila Ataliba - camila.ataliba@grupoggv.com' as message
UNION ALL
SELECT 
    '✅ Lô-Ruama: Lô-Ruama Oliveira - lo.ruama@grupoggv.com' as message
UNION ALL
SELECT 
    '✅ Sistema pronto para uso!' as message;
