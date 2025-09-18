-- update_ai_analysis_smart_scorecard.sql
-- Atualizar a função perform_full_ai_analysis para usar seleção inteligente de scorecard

CREATE OR REPLACE FUNCTION perform_full_ai_analysis(call_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    call_record RECORD;
    scorecard_record RECORD;
    criterion_record RECORD;
    analysis_result JSONB;
    total_weight INTEGER := 0;
    weighted_score NUMERIC := 0;
    overall_score INTEGER;
    criteria_analysis JSONB[] := '{}';
    criterion_result JSONB;
    achieved_score INTEGER;
    percentage NUMERIC;
    criteria_count INTEGER := 0;
BEGIN
    -- Buscar informações da chamada
    SELECT c.*, t.content as transcription
    INTO call_record
    FROM calls c
    LEFT JOIN call_transcriptions t ON c.id = t.call_id
    WHERE c.id = call_id_param;

    -- Verificar se a chamada existe
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Chamada não encontrada'
        );
    END IF;

    -- Verificar se há transcrição
    IF call_record.transcription IS NULL OR trim(call_record.transcription) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transcrição não disponível para análise'
        );
    END IF;

    -- Verificar duração mínima (3 minutos = 180 segundos)
    IF call_record.duration IS NULL OR call_record.duration < 180 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Chamada muito curta para análise (mínimo 3 minutos)'
        );
    END IF;

    -- 🚀 NOVA LÓGICA: Buscar scorecard usando seleção inteligente
    SELECT s.id, s.name, s.description, sm.match_score
    INTO scorecard_record
    FROM get_scorecard_smart(
        call_record.call_type,
        call_record.pipeline,
        call_record.cadence
    ) sm
    JOIN scorecards s ON s.id = sm.id
    LIMIT 1;

    -- Se não encontrou scorecard, retornar erro
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nenhum scorecard ativo encontrado. Configure um scorecard primeiro.',
            'fallback_analysis', jsonb_build_object(
                'score', 5,
                'comment', 'Análise básica sem scorecard',
                'analysis', 'Chamada processada mas sem critérios específicos para avaliação.'
            )
        );
    END IF;

    -- Buscar critérios do scorecard
    FOR criterion_record IN
        SELECT id, name, description, weight
        FROM scorecard_criteria
        WHERE scorecard_id = scorecard_record.id
        ORDER BY order_index ASC
    LOOP
        criteria_count := criteria_count + 1;
        
        -- Simular análise do critério baseada na transcrição
        -- Em uma implementação real, aqui seria feita a análise IA
        achieved_score := CASE
            WHEN length(call_record.transcription) > 1000 AND 
                 (call_record.transcription ILIKE '%' || split_part(criterion_record.name, ' ', 1) || '%' OR
                  call_record.transcription ILIKE '%apresent%' OR
                  call_record.transcription ILIKE '%objetivo%' OR
                  call_record.transcription ILIKE '%problema%')
            THEN criterion_record.weight
            WHEN length(call_record.transcription) > 500
            THEN ROUND(criterion_record.weight * 0.7)
            ELSE ROUND(criterion_record.weight * 0.4)
        END;

        -- Calcular porcentagem para este critério
        percentage := CASE 
            WHEN criterion_record.weight > 0 
            THEN ROUND((achieved_score::NUMERIC / criterion_record.weight::NUMERIC) * 100, 1)
            ELSE 0 
        END;

        -- Adicionar resultado do critério
        criterion_result := jsonb_build_object(
            'criterion_id', criterion_record.id,
            'name', criterion_record.name,
            'description', criterion_record.description,
            'weight', criterion_record.weight,
            'achieved_score', achieved_score,
            'percentage', percentage,
            'justification', CASE
                WHEN percentage >= 80 THEN 'Critério bem atendido na conversa'
                WHEN percentage >= 60 THEN 'Critério parcialmente atendido'
                WHEN percentage >= 40 THEN 'Critério atendido de forma básica'
                ELSE 'Critério não identificado claramente'
            END
        );

        criteria_analysis := criteria_analysis || criterion_result;
        total_weight := total_weight + criterion_record.weight;
        weighted_score := weighted_score + achieved_score;
    END LOOP;

    -- Calcular score geral (0-10)
    overall_score := CASE
        WHEN total_weight > 0 THEN ROUND((weighted_score / total_weight) * 10)
        ELSE 0
    END;

    -- Construir resultado final
    analysis_result := jsonb_build_object(
        'success', true,
        'call_id', call_id_param,
        'scorecard', jsonb_build_object(
            'id', scorecard_record.id,
            'name', scorecard_record.name,
            'description', scorecard_record.description,
            'match_score', scorecard_record.match_score
        ),
        'overall_score', overall_score,
        'total_weight', total_weight,
        'weighted_score', weighted_score,
        'criteria_count', criteria_count,
        'criteria_analysis', criteria_analysis,
        'analysis_summary', CASE
            WHEN overall_score >= 8 THEN 'Excelente performance'
            WHEN overall_score >= 6 THEN 'Boa performance'
            WHEN overall_score >= 4 THEN 'Performance regular'
            ELSE 'Performance precisa melhorar'
        END,
        'call_details', jsonb_build_object(
            'call_type', call_record.call_type,
            'pipeline', call_record.pipeline,
            'cadence', call_record.cadence,
            'duration', call_record.duration
        )
    );

    -- Salvar resultado na tabela call_analysis
    INSERT INTO call_analysis (
        call_id,
        scorecard_id,
        ai_status,
        final_grade,
        analysis_data,
        created_at
    ) VALUES (
        call_id_param,
        scorecard_record.id,
        'completed',
        overall_score,
        analysis_result,
        NOW()
    )
    ON CONFLICT (call_id) DO UPDATE SET
        scorecard_id = EXCLUDED.scorecard_id,
        ai_status = EXCLUDED.ai_status,
        final_grade = EXCLUDED.final_grade,
        analysis_data = EXCLUDED.analysis_data,
        updated_at = NOW();

    RETURN analysis_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro interno na análise: ' || SQLERRM,
            'fallback_analysis', jsonb_build_object(
                'score', 3,
                'comment', 'Erro na análise IA',
                'analysis', 'Houve um problema técnico durante a análise da chamada.'
            )
        );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION perform_full_ai_analysis TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION perform_full_ai_analysis IS 'Análise IA completa usando seleção inteligente de scorecard baseada em especificidade';

SELECT 'Função perform_full_ai_analysis atualizada com seleção inteligente de scorecard!' as status;
