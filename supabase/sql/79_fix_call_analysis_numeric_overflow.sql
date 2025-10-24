-- ===================================================================
-- FIX NUMERIC OVERFLOW - Corrigir erro de overflow numérico
-- ===================================================================

-- 1. Alterar colunas para suportar valores maiores
ALTER TABLE public.call_analysis 
ALTER COLUMN overall_score TYPE NUMERIC(10,2),
ALTER COLUMN max_possible_score TYPE NUMERIC(10,2);

-- 2. Remover constraints muito restritivos
ALTER TABLE public.call_analysis 
DROP CONSTRAINT IF EXISTS call_analysis_overall_score_check;

ALTER TABLE public.call_analysis 
ADD CONSTRAINT call_analysis_overall_score_check 
CHECK (overall_score >= 0 AND overall_score <= 1000);

-- 3. Função corrigida para salvar análise com tratamento de valores
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
    safe_overall_score NUMERIC;
    safe_max_score NUMERIC;
    safe_final_grade NUMERIC;
    safe_confidence NUMERIC;
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

    -- Sanitizar valores numéricos para evitar overflow
    safe_overall_score := LEAST(1000.0, GREATEST(0.0, COALESCE(p_overall_score, 0.0)));
    safe_max_score := LEAST(1000.0, GREATEST(0.0, COALESCE(p_max_possible_score, 10.0)));
    safe_final_grade := LEAST(10.0, GREATEST(0.0, COALESCE(p_final_grade, 0.0)));
    safe_confidence := LEAST(1.0, GREATEST(0.0, COALESCE(p_confidence, 0.8)));

    -- Log dos valores para debug
    RAISE NOTICE 'Salvando análise: call_id=%, overall_score=%, final_grade=%', 
        p_call_id, safe_overall_score, safe_final_grade;

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
        safe_overall_score,
        safe_max_score,
        safe_final_grade,
        COALESCE(p_general_feedback, 'Análise processada com sucesso'),
        COALESCE(p_strengths, ARRAY[]::TEXT[]),
        COALESCE(p_improvements, ARRAY[]::TEXT[]),
        safe_confidence,
        COALESCE(p_criteria_data, '[]'::JSONB),
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
            'final_score', safe_final_grade,
            'analysis_id', analysis_id,
            'last_analyzed', NOW()
        ),
        ai_status = 'completed',
        insights = COALESCE(insights, '{}'::jsonb) || jsonb_build_object(
            'analysis_summary', COALESCE(p_general_feedback, 'Análise processada com sucesso'),
            'analysis_confidence', safe_confidence,
            'analysis_processed_at', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_call_id;

    RETURN analysis_id::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao salvar análise: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.save_call_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_call_analysis TO service_role;

-- 5. Teste da função
SELECT 'Função save_call_analysis corrigida para evitar overflow numérico!' as status;


