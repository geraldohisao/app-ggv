-- 20_calls_system.sql
-- Sistema de Calls migrado do Docker para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- =========================================
-- ETAPA 1: CRIAR TABELA DE CALLS
-- =========================================

CREATE TABLE IF NOT EXISTS calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_call_id TEXT NOT NULL UNIQUE,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed')),
    duration INTEGER DEFAULT 0,
    recording_url TEXT,
    transcription TEXT,
    insights JSONB DEFAULT '{}',
    scorecard JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- =========================================
-- ETAPA 2: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- Habilitar Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todas as calls (admin)
CREATE POLICY "Authenticated users can view calls" ON calls 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Apenas service_role pode inserir/atualizar calls
CREATE POLICY "Service role can manage calls" ON calls 
    FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- ETAPA 3: ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_calls_provider_call_id ON calls(provider_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);

-- =========================================
-- ETAPA 4: FUNÇÃO PARA BUSCAR CALLS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    status TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH total AS (
        SELECT COUNT(*) as count 
        FROM calls 
        WHERE (p_status IS NULL OR status = p_status)
    )
    SELECT 
        c.id,
        c.provider_call_id,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.status,
        c.duration,
        c.created_at,
        t.count as total_count
    FROM calls c, total t
    WHERE (p_status IS NULL OR c.status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_calls(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls(INTEGER, INTEGER, TEXT) TO service_role;

-- =========================================
-- ETAPA 5: FUNÇÃO PARA DETALHES DE UMA CALL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    status TEXT,
    duration INTEGER,
    recording_url TEXT,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        provider_call_id,
        from_number,
        to_number,
        agent_id,
        status,
        duration,
        recording_url,
        transcription,
        insights,
        scorecard,
        created_at,
        updated_at,
        processed_at
    FROM calls 
    WHERE id = p_call_id;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO service_role;

-- =========================================
-- ETAPA 6: DADOS DE EXEMPLO (OPCIONAL)
-- =========================================

-- Inserir algumas calls de exemplo para teste
INSERT INTO calls (provider_call_id, from_number, to_number, agent_id, status, duration)
VALUES 
    ('call_001', '+5511999999999', '+5511888888888', 'agent_001', 'processed', 300),
    ('call_002', '+5511777777777', '+5511666666666', 'agent_002', 'processing', 0),
    ('call_003', '+5511555555555', '+5511444444444', 'agent_001', 'received', 0)
ON CONFLICT (provider_call_id) DO NOTHING;

-- =========================================
-- COMENTÁRIOS FINAIS
-- =========================================

-- Este script migra o sistema de calls do Docker/PostgreSQL para Supabase
-- As principais mudanças:
-- 1. Tabela calls com todos os campos necessários
-- 2. RLS configurado para segurança
-- 3. Funções SQL para substituir a API REST
-- 4. Índices para performance
-- 5. Dados de exemplo para teste

