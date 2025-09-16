-- ===================================================================
-- SISTEMA DE PERSISTÊNCIA DE ANÁLISES DE CHAMADAS
-- Solução definitiva para salvar análises IA no banco de dados
-- ===================================================================

-- 1. Criar tabela para armazenar análises de chamadas
CREATE TABLE IF NOT EXISTS public.call_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    scorecard_id UUID,
    scorecard_name TEXT NOT NULL,
    overall_score NUMERIC(10,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1000),
    max_possible_score NUMERIC(10,2) NOT NULL DEFAULT 10.0,
    final_grade NUMERIC(10,2) NOT NULL CHECK (final_grade >= 0 AND final_grade <= 10),
    general_feedback TEXT,
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    confidence NUMERIC(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
    criteria_analysis JSONB DEFAULT '[]',
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir uma análise por chamada
    UNIQUE(call_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_call_analysis_call_id ON public.call_analysis(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_scorecard_id ON public.call_analysis(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_overall_score ON public.call_analysis(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_call_analysis_created_at ON public.call_analysis(created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE public.call_analysis ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de segurança
CREATE POLICY "Users can view call analysis" ON public.call_analysis
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage call analysis" ON public.call_analysis
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Função para salvar análise de chamada
CREATE OR REPLACE FUNCTION public.save_call_analysis(
    p_call_id UUID,
    p_scorecard_id UUID,
    p_overall_score NUMERIC,
    p_max_possible_score NUMERIC,
    p_final_grade NUMERIC,
    p_general_feedback TEXT,
    p_strengths TEXT[],
    p_improvements TEXT[],
    p_confidence NUMERIC,
    p_criteria_data JSONB,
    p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    analysis_id UUID;
    scorecard_name_val TEXT;
BEGIN
    -- Buscar nome do scorecard se fornecido
    IF p_scorecard_id IS NOT NULL THEN
        SELECT name INTO scorecard_name_val 
        FROM scorecards 
        WHERE id = p_scorecard_id;
        
        IF scorecard_name_val IS NULL THEN
            scorecard_name_val := 'Scorecard Padrão';
        END IF;
    ELSE
        scorecard_name_val := 'Análise IA Automática';
    END IF;

    -- Inserir ou atualizar análise
    INSERT INTO public.call_analysis (
        call_id,
        scorecard_id,
        scorecard_name,
        overall_score,
        max_possible_score,
        final_grade,
        general_feedback,
        strengths,
        improvements,
        confidence,
        criteria_analysis,
        processing_time_ms,
        updated_at
    ) VALUES (
        p_call_id,
        p_scorecard_id,
        scorecard_name_val,
        p_overall_score,
        p_max_possible_score,
        p_final_grade,
        p_general_feedback,
        p_strengths,
        p_improvements,
        p_confidence,
        p_criteria_data,
        p_processing_time_ms,
        NOW()
    )
    ON CONFLICT (call_id) 
    DO UPDATE SET
        scorecard_id = EXCLUDED.scorecard_id,
        scorecard_name = EXCLUDED.scorecard_name,
        overall_score = EXCLUDED.overall_score,
        max_possible_score = EXCLUDED.max_possible_score,
        final_grade = EXCLUDED.final_grade,
        general_feedback = EXCLUDED.general_feedback,
        strengths = EXCLUDED.strengths,
        improvements = EXCLUDED.improvements,
        confidence = EXCLUDED.confidence,
        criteria_analysis = EXCLUDED.criteria_analysis,
        processing_time_ms = EXCLUDED.processing_time_ms,
        updated_at = NOW()
    RETURNING id INTO analysis_id;

    -- Atualizar tabela calls com o score
    UPDATE calls 
    SET 
        scorecard = jsonb_build_object(
            'final_score', p_final_grade,
            'analysis_id', analysis_id,
            'last_analyzed', NOW()
        ),
        ai_status = 'completed',
        updated_at = NOW()
    WHERE id = p_call_id;

    RETURN analysis_id::TEXT;
END;
$$;

-- 6. Função para buscar análise de chamada
CREATE OR REPLACE FUNCTION public.get_call_analysis(
    p_call_id UUID
)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    scorecard_id UUID,
    scorecard_name TEXT,
    overall_score NUMERIC,
    max_possible_score NUMERIC,
    final_grade NUMERIC,
    general_feedback TEXT,
    strengths TEXT[],
    improvements TEXT[],
    confidence NUMERIC,
    criteria_analysis JSONB,
    analysis_created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ca.id,
        ca.call_id,
        ca.scorecard_id,
        ca.scorecard_name,
        ca.overall_score,
        ca.max_possible_score,
        ca.final_grade,
        ca.general_feedback,
        ca.strengths,
        ca.improvements,
        ca.confidence,
        ca.criteria_analysis,
        ca.created_at as analysis_created_at
    FROM public.call_analysis ca
    WHERE ca.call_id = p_call_id;
$$;

-- 7. Função para buscar estatísticas de análises
CREATE OR REPLACE FUNCTION public.get_analysis_statistics()
RETURNS TABLE (
    total_calls BIGINT,
    calls_analyzed BIGINT,
    avg_score NUMERIC,
    calls_needing_analysis BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH stats AS (
        SELECT 
            COUNT(c.id) as total_calls,
            COUNT(ca.id) as calls_analyzed,
            AVG(ca.final_grade) as avg_score
        FROM calls c
        LEFT JOIN call_analysis ca ON c.id = ca.call_id
        WHERE c.transcription IS NOT NULL 
        AND LENGTH(TRIM(c.transcription)) > 50
        AND c.duration > 180
    )
    SELECT 
        s.total_calls,
        s.calls_analyzed,
        ROUND(s.avg_score, 2) as avg_score,
        (s.total_calls - s.calls_analyzed) as calls_needing_analysis
    FROM stats s;
$$;

-- 8. Função para buscar chamadas que precisam de análise
CREATE OR REPLACE FUNCTION public.get_calls_needing_analysis(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    transcription TEXT,
    duration INTEGER,
    sdr_name TEXT,
    enterprise TEXT,
    person TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.transcription,
        c.duration,
        c.sdr_name,
        c.enterprise,
        c.person,
        c.created_at
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.transcription IS NOT NULL 
    AND LENGTH(TRIM(c.transcription)) > 50
    AND c.duration > 180
    AND ca.id IS NULL  -- Não tem análise ainda
    AND c.ai_status != 'completed'
    ORDER BY c.created_at DESC
    LIMIT p_limit;
$$;

-- 9. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_call_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_analysis_updated_at
    BEFORE UPDATE ON public.call_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_call_analysis_updated_at();

-- 10. Conceder permissões
GRANT SELECT, INSERT, UPDATE ON public.call_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_call_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analysis_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_needing_analysis TO authenticated;

-- Permissões para service_role
GRANT ALL ON public.call_analysis TO service_role;
GRANT EXECUTE ON FUNCTION public.save_call_analysis TO service_role;
GRANT EXECUTE ON FUNCTION public.get_call_analysis TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analysis_statistics TO service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_needing_analysis TO service_role;

-- 11. Comentários para documentação
COMMENT ON TABLE public.call_analysis IS 'Armazena análises IA persistentes das chamadas com scores e feedback detalhado';
COMMENT ON FUNCTION public.save_call_analysis IS 'Salva ou atualiza análise de chamada com upsert automático';
COMMENT ON FUNCTION public.get_call_analysis IS 'Recupera análise salva de uma chamada específica';
COMMENT ON FUNCTION public.get_analysis_statistics IS 'Retorna estatísticas gerais das análises';
COMMENT ON FUNCTION public.get_calls_needing_analysis IS 'Lista chamadas que ainda precisam ser analisadas';

-- 12. Verificação final
SELECT 'Sistema de persistência de análises criado com sucesso!' as status;

-- Verificar se as funções foram criadas
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('save_call_analysis', 'get_call_analysis', 'get_analysis_statistics', 'get_calls_needing_analysis')
ORDER BY proname;
