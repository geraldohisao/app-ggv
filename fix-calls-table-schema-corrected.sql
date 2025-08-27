-- Script para corrigir a estrutura da tabela calls (VERSÃO CORRIGIDA)
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR E CORRIGIR TABELA CALLS
-- =========================================

-- Verificar se a tabela calls existe e sua estrutura atual
SELECT 'VERIFICANDO ESTRUTURA ATUAL DA TABELA CALLS' as status;

-- Verificar colunas existentes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;

-- =========================================
-- ETAPA 2: ADICIONAR COLUNAS QUE FALTAM
-- =========================================

-- Adicionar coluna sdr_name se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'sdr_name') THEN
        ALTER TABLE calls ADD COLUMN sdr_name TEXT;
        RAISE NOTICE 'Coluna sdr_name adicionada à tabela calls';
    ELSE
        RAISE NOTICE 'Coluna sdr_name já existe na tabela calls';
    END IF;
END $$;

-- Adicionar coluna sdr_email se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'sdr_email') THEN
        ALTER TABLE calls ADD COLUMN sdr_email TEXT;
        RAISE NOTICE 'Coluna sdr_email adicionada à tabela calls';
    ELSE
        RAISE NOTICE 'Coluna sdr_email já existe na tabela calls';
    END IF;
END $$;

-- =========================================
-- ETAPA 3: ATUALIZAR FUNÇÃO get_calls_v2 (CORRIGIDA)
-- =========================================

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
           COALESCE(c.sdr_name, p.full_name, um.full_name) as resolved_sdr_name,
           COALESCE(c.sdr_email, p.email, um.email) as resolved_sdr_email
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
    b.resolved_sdr_name as sdr_name,
    b.resolved_sdr_email as sdr_email,
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

-- =========================================
-- ETAPA 4: ATUALIZAR FUNÇÃO get_call_details (CORRIGIDA)
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    company TEXT,
    deal_id TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
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
    processed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.provider_call_id,
    COALESCE(
        (c.insights->>'company'), 
        (c.insights->'metadata'->>'company'),
        'Empresa não informada'
    ) AS company,
    c.deal_id,
    c.sdr_id,
    COALESCE(c.sdr_name, p.full_name, um.full_name) as sdr_name,
    COALESCE(c.sdr_email, p.email, um.email) as sdr_email,
    p.avatar_url as sdr_avatar_url,
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
    c.processed_at
  FROM calls c
  LEFT JOIN profiles p ON c.sdr_id = p.id
  LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
  WHERE c.id = p_call_id;
$$;

-- =========================================
-- ETAPA 5: INSERIR DADOS DE EXEMPLO
-- =========================================

-- Inserir algumas chamadas de exemplo se a tabela estiver vazia
INSERT INTO calls (
    provider_call_id,
    from_number,
    to_number,
    agent_id,
    sdr_id,
    sdr_name,
    status,
    duration,
    call_type,
    direction,
    transcription,
    transcript_status,
    ai_status,
    insights,
    scorecard,
    created_at
)
SELECT 
    'call_' || generate_series(1, 5),
    '+5511999999999',
    '+5511888888888',
    'Andressa',
    'e2f530f2-be2d-473d-8829-97a24eab13fc',
    'Samuel Bueno',
    CASE (generate_series(1, 5) % 3)
        WHEN 0 THEN 'processed'
        WHEN 1 THEN 'processing'
        ELSE 'received'
    END,
    (generate_series(1, 5) * 60) + 30,
    'outbound',
    'outbound',
    CASE (generate_series(1, 5) % 2)
        WHEN 0 THEN 'Olá, sou Samuel da empresa XYZ. Gostaria de falar sobre nossos serviços...'
        ELSE NULL
    END,
    CASE (generate_series(1, 5) % 2)
        WHEN 0 THEN 'completed'
        ELSE 'pending'
    END,
    CASE (generate_series(1, 5) % 2)
        WHEN 0 THEN 'analyzed'
        ELSE 'pending'
    END,
    jsonb_build_object(
        'company', 'Empresa ' || generate_series(1, 5),
        'deal_id', 'deal_' || generate_series(1, 5),
        'metadata', jsonb_build_object('company', 'Empresa ' || generate_series(1, 5))
    ),
    CASE (generate_series(1, 5) % 2)
        WHEN 0 THEN jsonb_build_object(
            'finalScore', 85,
            'analysisDate', now(),
            'qualityIndicators', jsonb_build_object(
                'opening', 'A SDR se apresentou de forma profissional.',
                'needs_exploration', 'Poderia aprofundar a necessidade do prospect.'
            )
        )
        ELSE '{}'::jsonb
    END,
    now() - (generate_series(1, 5) || ' days')::interval
WHERE NOT EXISTS (SELECT 1 FROM calls LIMIT 1);

-- =========================================
-- ETAPA 6: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se tudo está funcionando
SELECT 'VERIFICAÇÃO FINAL DA CORREÇÃO' as status;

-- Testar função get_calls_v2
SELECT 'Testando get_calls_v2...' as test;
SELECT COUNT(*) as total_calls FROM get_calls_v2(10, 0, NULL, NULL, NULL, NULL, NULL);

-- Testar função get_call_details
SELECT 'Testando get_call_details...' as test;
SELECT COUNT(*) as total_details FROM get_call_details(
    (SELECT id FROM calls LIMIT 1)
);

-- Verificar dados inseridos
SELECT 'Verificando dados...' as test;
SELECT 
    id,
    provider_call_id,
    sdr_name,
    status,
    duration,
    transcription IS NOT NULL as has_transcription,
    ai_status
FROM calls 
ORDER BY created_at DESC 
LIMIT 5;

-- Resumo final
SELECT '🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!' as message
UNION ALL
SELECT '✅ Colunas sdr_name e sdr_email adicionadas'
UNION ALL
SELECT '✅ Funções RPC atualizadas (ambiguidade corrigida)'
UNION ALL
SELECT '✅ Dados de exemplo inseridos'
UNION ALL
SELECT '✅ Sistema pronto para uso!';
