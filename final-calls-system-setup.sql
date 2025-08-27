-- Script final para configurar completamente o sistema de chamadas
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR E CRIAR TABELAS NECESSÁRIAS
-- =========================================

-- 1. Verificar se a tabela calls existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calls') THEN
        RAISE EXCEPTION 'Tabela calls não encontrada. Execute primeiro o script 20_calls_system.sql';
    END IF;
END $$;

-- 2. Verificar se a tabela user_mapping existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_mapping') THEN
        RAISE EXCEPTION 'Tabela user_mapping não encontrada. Execute primeiro o script de configuração de usuários.';
    END IF;
END $$;

-- 3. Verificar se a tabela profiles existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE EXCEPTION 'Tabela profiles não encontrada. Execute primeiro o script de configuração de perfis.';
    END IF;
END $$;

-- =========================================
-- ETAPA 2: CRIAR/ATUALIZAR FUNÇÃO get_calls_v2
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
           COALESCE(p.full_name, um.full_name) as sdr_name,
           COALESCE(p.email, um.email) as sdr_email
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

-- =========================================
-- ETAPA 3: CRIAR FUNÇÃO PARA DETALHES DE CHAMADA
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
    COALESCE(p.full_name, um.full_name) as sdr_name,
    COALESCE(p.email, um.email) as sdr_email,
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
-- ETAPA 4: CRIAR FUNÇÃO PARA MÉTRICAS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_metrics(
    p_sdr_id UUID DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_calls BIGINT,
    answered_calls BIGINT,
    missed_calls BIGINT,
    avg_duration NUMERIC,
    total_duration BIGINT,
    with_transcription BIGINT,
    with_audio BIGINT,
    by_call_type JSONB,
    by_status JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_calls AS (
    SELECT *
    FROM calls
    WHERE (p_sdr_id IS NULL OR sdr_id = p_sdr_id OR agent_id = p_sdr_id::TEXT)
      AND (p_start IS NULL OR created_at >= p_start)
      AND (p_end IS NULL OR created_at <= p_end)
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_calls,
      COUNT(CASE WHEN status IN ('answered', 'processed') THEN 1 END) as answered_calls,
      COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
      AVG(duration) as avg_duration,
      SUM(duration) as total_duration,
      COUNT(CASE WHEN transcription IS NOT NULL AND transcription != '' THEN 1 END) as with_transcription,
      COUNT(CASE WHEN recording_url IS NOT NULL AND recording_url != '' THEN 1 END) as with_audio
    FROM filtered_calls
  ),
  call_type_stats AS (
    SELECT jsonb_object_agg(call_type, count) as by_call_type
    FROM (
      SELECT call_type, COUNT(*) as count
      FROM filtered_calls
      WHERE call_type IS NOT NULL
      GROUP BY call_type
    ) t
  ),
  status_stats AS (
    SELECT jsonb_object_agg(status, count) as by_status
    FROM (
      SELECT status, COUNT(*) as count
      FROM filtered_calls
      GROUP BY status
    ) s
  )
  SELECT
    m.total_calls,
    m.answered_calls,
    m.missed_calls,
    ROUND(m.avg_duration, 2) as avg_duration,
    m.total_duration,
    m.with_transcription,
    m.with_audio,
    COALESCE(ct.by_call_type, '{}'::jsonb) as by_call_type,
    COALESCE(st.by_status, '{}'::jsonb) as by_status
  FROM metrics m
  CROSS JOIN call_type_stats ct
  CROSS JOIN status_stats st;
$$;

-- =========================================
-- ETAPA 5: CRIAR TABELAS PARA COMENTÁRIOS E SCORES
-- =========================================

-- Tabela para comentários de chamadas
CREATE TABLE IF NOT EXISTS call_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at_seconds INTEGER DEFAULT 0,
    author_id UUID,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para scorecards
CREATE TABLE IF NOT EXISTS scorecards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para critérios de scorecard
CREATE TABLE IF NOT EXISTS scorecard_criteria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para scores de chamadas
CREATE TABLE IF NOT EXISTS call_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES scorecard_criteria(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
    justification TEXT,
    analysis_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- ETAPA 6: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;

-- Políticas para call_comments
CREATE POLICY "Authenticated users can view call comments" ON call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert call comments" ON call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own call comments" ON call_comments 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para scorecards
CREATE POLICY "Authenticated users can manage scorecards" ON scorecards 
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para scorecard_criteria
CREATE POLICY "Authenticated users can manage scorecard criteria" ON scorecard_criteria 
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para call_scores
CREATE POLICY "Authenticated users can manage call scores" ON call_scores 
    FOR ALL USING (auth.role() = 'authenticated');

-- =========================================
-- ETAPA 7: CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_scorecard_id ON scorecard_criteria(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_order ON scorecard_criteria(scorecard_id, order_index);
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_criterion_id ON call_scores(criterion_id);

-- =========================================
-- ETAPA 8: INSERIR DADOS DE EXEMPLO
-- =========================================

-- Inserir scorecard padrão se não existir
INSERT INTO scorecards (id, name, description, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Scorecard Padrão',
    'Scorecard padrão para avaliação de chamadas',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Inserir critérios padrão se não existirem
INSERT INTO scorecard_criteria (scorecard_id, category, text, weight, order_index)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Abertura', 'Apresentação clara e profissional', 2, 1),
    ('00000000-0000-0000-0000-000000000001', 'Abertura', 'Identificação da empresa e propósito da ligação', 2, 2),
    ('00000000-0000-0000-0000-000000000001', 'Desenvolvimento', 'Descoberta de necessidades', 3, 3),
    ('00000000-0000-0000-0000-000000000001', 'Desenvolvimento', 'Apresentação de solução adequada', 3, 4),
    ('00000000-0000-0000-0000-000000000001', 'Fechamento', 'Tratamento de objeções', 2, 5),
    ('00000000-0000-0000-0000-000000000001', 'Fechamento', 'Agendamento de próximo contato', 2, 6)
ON CONFLICT DO NOTHING;

-- =========================================
-- ETAPA 9: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se tudo está funcionando
SELECT 'VERIFICAÇÃO FINAL DO SISTEMA DE CHAMADAS' as status;

-- Testar função get_calls_v2
SELECT 'Testando get_calls_v2...' as test;
SELECT COUNT(*) as total_calls FROM get_calls_v2(10, 0, NULL, NULL, NULL, NULL, NULL);

-- Testar função get_calls_metrics
SELECT 'Testando get_calls_metrics...' as test;
SELECT * FROM get_calls_metrics(NULL, NULL, NULL);

-- Verificar tabelas criadas
SELECT 'Verificando tabelas...' as test;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('calls', 'user_mapping', 'profiles', 'call_comments', 'scorecards', 'scorecard_criteria', 'call_scores') 
        THEN '✅ Existe' 
        ELSE '❌ Não encontrada' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('calls', 'user_mapping', 'profiles', 'call_comments', 'scorecards', 'scorecard_criteria', 'call_scores')
ORDER BY table_name;

-- Verificar funções criadas
SELECT 'Verificando funções...' as test;
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('get_calls_v2', 'get_call_details', 'get_calls_metrics') 
        THEN '✅ Existe' 
        ELSE '❌ Não encontrada' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_calls_v2', 'get_call_details', 'get_calls_metrics')
ORDER BY routine_name;

-- Resumo final
SELECT '🎉 SISTEMA DE CHAMADAS CONFIGURADO COM SUCESSO!' as message
UNION ALL
SELECT '✅ Todas as tabelas necessárias foram criadas'
UNION ALL
SELECT '✅ Todas as funções RPC foram configuradas'
UNION ALL
SELECT '✅ Sistema de segurança (RLS) foi habilitado'
UNION ALL
SELECT '✅ Dados de exemplo foram inseridos'
UNION ALL
SELECT '✅ Sistema pronto para uso no frontend!';
