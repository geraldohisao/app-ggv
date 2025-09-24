-- MODIFICAR_SISTEMA_ANALISE_PERMANENTE.sql
-- Script para modificar o sistema de análise para salvar permanentemente

-- =========================================
-- ETAPA 1: CRIAR TABELA PARA ANÁLISES PERMANENTES
-- =========================================

-- Criar tabela para armazenar análises permanentemente
CREATE TABLE IF NOT EXISTS call_analysis_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deal_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
    analysis_content TEXT NOT NULL,
    transcription_summary TEXT,
    call_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    custom_prompt TEXT, -- Para salvar o prompt personalizado usado
    ai_persona_id TEXT DEFAULT 'call_analyst',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT fk_analysis_persona FOREIGN KEY (ai_persona_id) REFERENCES ai_personas(id)
);

-- Habilitar RLS
ALTER TABLE call_analysis_history ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver análises
CREATE POLICY "Authenticated users can view analysis history" ON call_analysis_history 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Apenas service_role pode inserir/atualizar análises
CREATE POLICY "Service role can manage analysis history" ON call_analysis_history 
    FOR ALL USING (auth.role() = 'service_role');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_analysis_history_deal_id ON call_analysis_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON call_analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_type ON call_analysis_history(analysis_type);

-- =========================================
-- ETAPA 2: FUNÇÃO PARA BUSCAR ANÁLISES POR DEAL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_deal_analysis_history(p_deal_id TEXT)
RETURNS TABLE (
    id UUID,
    analysis_type TEXT,
    analysis_content TEXT,
    transcription_summary TEXT,
    call_count INTEGER,
    total_duration INTEGER,
    custom_prompt TEXT,
    ai_persona_id TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        analysis_type,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        ai_persona_id,
        created_at
    FROM call_analysis_history 
    WHERE deal_id = p_deal_id
    ORDER BY created_at DESC;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_deal_analysis_history(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deal_analysis_history(TEXT) TO service_role;

-- =========================================
-- ETAPA 3: FUNÇÃO PARA SALVAR ANÁLISE PERMANENTE
-- =========================================

CREATE OR REPLACE FUNCTION public.save_analysis_permanent(
    p_deal_id TEXT,
    p_analysis_content TEXT,
    p_transcription_summary TEXT,
    p_call_count INTEGER,
    p_total_duration INTEGER,
    p_custom_prompt TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    analysis_id UUID;
BEGIN
    INSERT INTO call_analysis_history (
        deal_id,
        analysis_type,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        ai_persona_id
    ) VALUES (
        p_deal_id,
        'comprehensive',
        p_analysis_content,
        p_transcription_summary,
        p_call_count,
        p_total_duration,
        p_custom_prompt,
        'call_analyst'
    ) RETURNING id INTO analysis_id;
    
    RETURN analysis_id;
END;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.save_analysis_permanent(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_analysis_permanent(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;

-- =========================================
-- ETAPA 4: FUNÇÃO PARA BUSCAR ÚLTIMA ANÁLISE
-- =========================================

CREATE OR REPLACE FUNCTION public.get_latest_analysis(p_deal_id TEXT)
RETURNS TABLE (
    id UUID,
    analysis_content TEXT,
    transcription_summary TEXT,
    call_count INTEGER,
    total_duration INTEGER,
    custom_prompt TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        analysis_content,
        transcription_summary,
        call_count,
        total_duration,
        custom_prompt,
        created_at
    FROM call_analysis_history 
    WHERE deal_id = p_deal_id
    ORDER BY created_at DESC
    LIMIT 1;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.get_latest_analysis(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_analysis(TEXT) TO service_role;

-- =========================================
-- ETAPA 5: COMENTÁRIOS SOBRE O SISTEMA
-- =========================================

-- Este sistema agora salva TODAS as análises permanentemente
-- A tabela call_analysis_cache pode ser removida ou mantida como cache adicional
-- Todas as análises ficam disponíveis no histórico para consulta

COMMENT ON TABLE call_analysis_history IS 'Histórico permanente de todas as análises de IA realizadas por deal';
COMMENT ON FUNCTION get_deal_analysis_history(TEXT) IS 'Busca todo o histórico de análises de um deal específico';
COMMENT ON FUNCTION save_analysis_permanent(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) IS 'Salva uma análise de IA permanentemente no histórico';
COMMENT ON FUNCTION get_latest_analysis(TEXT) IS 'Busca a análise mais recente de um deal específico';
