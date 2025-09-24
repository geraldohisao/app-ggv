-- 21_call_analysis_ai.sql
-- Sistema de Análise de IA para Ligações por Deal
-- Execute este script no SQL Editor do seu projeto Supabase

-- =========================================
-- ETAPA 1: FUNÇÃO PARA BUSCAR TRANSCRIÇÕES POR DEAL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_transcriptions(p_deal_id TEXT)
RETURNS TABLE (
    call_id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    direction TEXT,
    call_type TEXT,
    duration INTEGER,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    created_at TIMESTAMPTZ,
    call_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id as call_id,
        provider_call_id,
        from_number,
        to_number,
        agent_id,
        direction,
        call_type,
        duration,
        transcription,
        insights,
        scorecard,
        created_at,
        status as call_status
    FROM calls 
    WHERE deal_id = p_deal_id
      AND transcription IS NOT NULL 
      AND transcription != ''
      AND status = 'processed'
    ORDER BY created_at ASC;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_transcriptions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_transcriptions(TEXT) TO service_role;

-- =========================================
-- ETAPA 2: FUNÇÃO PARA ESTATÍSTICAS DO DEAL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_call_stats(p_deal_id TEXT)
RETURNS TABLE (
    total_calls BIGINT,
    total_duration INTEGER,
    avg_duration NUMERIC,
    successful_calls BIGINT,
    first_call_date TIMESTAMPTZ,
    last_call_date TIMESTAMPTZ,
    call_types JSONB,
    agents_involved JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH call_stats AS (
        SELECT 
            COUNT(*) as total_calls,
            COALESCE(SUM(duration), 0) as total_duration,
            COALESCE(AVG(duration), 0) as avg_duration,
            COUNT(*) FILTER (WHERE status = 'processed' AND transcription IS NOT NULL) as successful_calls,
            MIN(created_at) as first_call_date,
            MAX(created_at) as last_call_date
        FROM calls 
        WHERE deal_id = p_deal_id
    ),
    call_types_stats AS (
        SELECT 
            COALESCE(jsonb_object_agg(call_type, call_count), '{}'::jsonb) as call_types
        FROM (
            SELECT 
                call_type,
                COUNT(*) as call_count
            FROM calls 
            WHERE deal_id = p_deal_id
              AND call_type IS NOT NULL
            GROUP BY call_type
        ) ct
    ),
    agents_stats AS (
        SELECT 
            COALESCE(jsonb_object_agg(agent_id, agent_count), '{}'::jsonb) as agents_involved
        FROM (
            SELECT 
                agent_id,
                COUNT(*) as agent_count
            FROM calls 
            WHERE deal_id = p_deal_id
              AND agent_id IS NOT NULL
            GROUP BY agent_id
        ) ag
    )
    SELECT 
        cs.total_calls,
        cs.total_duration,
        cs.avg_duration,
        cs.successful_calls,
        cs.first_call_date,
        cs.last_call_date,
        cts.call_types,
        ags.agents_involved
    FROM call_stats cs
    CROSS JOIN call_types_stats cts
    CROSS JOIN agents_stats ags;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_call_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_call_stats(TEXT) TO service_role;

-- =========================================
-- ETAPA 3: PERSONA ESPECIALIZADA EM ANÁLISE DE LIGAÇÕES
-- =========================================

-- Inserir persona especializada em análise de ligações
-- NOTA: A tabela ai_personas usa camelCase, não snake_case
INSERT INTO ai_personas (id, name, description, systemPrompt, tone, wordLimit, directives, personalityTraits)
VALUES (
    'call_analyst',
    'Analista de Ligações',
    'Especialista em análise e contextualização de transcrições de ligações comerciais',
    'Você é um especialista em análise de ligações comerciais da GGV Inteligência em Vendas.

**SUA MISSÃO:**
Analisar transcrições de ligações para extrair insights valiosos sobre:
- Progressão do relacionamento comercial
- Objeções e preocupações do cliente
- Pontos de interesse e necessidades
- Momentos decisivos da conversa
- Qualidade da abordagem do vendedor

**DIRETRIZES DE ANÁLISE:**
1. **Contexto do Deal**: Sempre considere o histórico completo de ligações
2. **Progressão**: Identifique evolução ou regressão no relacionamento
3. **Objeções**: Destaque preocupações recorrentes e como foram tratadas
4. **Oportunidades**: Identifique momentos de oportunidade perdidos ou aproveitados
5. **Próximos Passos**: Sugira ações baseadas no conteúdo das ligações

**FORMATO DE RESPOSTA:**
- Use títulos claros (##) para seções
- Destaque pontos-chave com **negrito**
- Use listas para organizar informações
- Seja objetivo e acionável
- Foque em insights que geram valor comercial

**LIMITAÇÕES:**
- Base suas análises apenas nas transcrições fornecidas
- Não invente informações não presentes nas ligações
- Se não houver transcrições suficientes, indique claramente

Analise as ligações fornecidas e forneça uma visão estratégica para o desenvolvimento do deal.',
    'analítico e estratégico',
    4000,
    'Sempre analise o contexto completo das ligações e forneça insights acionáveis para o desenvolvimento comercial do deal.',
    ARRAY['Analítico', 'Estratégico', 'Orientado a resultados', 'Focado em insights']
)
ON CONFLICT (id) DO UPDATE SET
    systemPrompt = EXCLUDED.systemPrompt,
    tone = EXCLUDED.tone,
    wordLimit = EXCLUDED.wordLimit,
    directives = EXCLUDED.directives,
    personalityTraits = EXCLUDED.personalityTraits;

-- =========================================
-- ETAPA 4: TABELA PARA ARMAZENAR ANÁLISES
-- =========================================

CREATE TABLE IF NOT EXISTS call_analysis_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deal_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
    analysis_content TEXT NOT NULL,
    transcription_summary TEXT,
    call_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(deal_id, analysis_type)
);

-- Habilitar RLS
ALTER TABLE call_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver análises
CREATE POLICY "Authenticated users can view call analysis" ON call_analysis_cache 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Apenas service_role pode inserir/atualizar análises
CREATE POLICY "Service role can manage call analysis" ON call_analysis_cache 
    FOR ALL USING (auth.role() = 'service_role');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_call_analysis_deal_id ON call_analysis_cache(deal_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_expires_at ON call_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_call_analysis_created_at ON call_analysis_cache(created_at DESC);

-- =========================================
-- ETAPA 5: FUNÇÃO PARA LIMPEZA DE CACHE
-- =========================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_call_analysis()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM call_analysis_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.cleanup_expired_call_analysis() TO service_role;

-- =========================================
-- COMENTÁRIOS FINAIS
-- =========================================

-- Este script implementa:
-- 1. Função para buscar todas as transcrições de um deal
-- 2. Função para estatísticas de ligações do deal
-- 3. Persona especializada em análise de ligações
-- 4. Sistema de cache para análises
-- 5. Limpeza automática de cache expirado

-- PRÓXIMOS PASSOS:
-- 1. Implementar função JavaScript para análise com IA
-- 2. Criar interface React para exibir análises
-- 3. Integrar na seção de chamadas existente

