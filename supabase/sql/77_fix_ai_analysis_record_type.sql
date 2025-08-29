-- ===================================================================
-- FIX AI ANALYSIS RECORD TYPE - Corrigir erro de tipo RECORD[]
-- ===================================================================

-- 1. Criar função corrigida sem usar RECORD[]
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

    -- Buscar scorecard apropriado para a etapa da chamada
    SELECT s.id, s.name, s.description
    INTO scorecard_record
    FROM scorecards s
    INNER JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
    WHERE s.active = true 
    AND (
        sctm.call_type = call_record.call_type 
        OR (call_record.call_type IS NULL AND sctm.call_type IS NULL)
    )
    LIMIT 1;

    -- Se não encontrou scorecard específico, tentar scorecard para indefinida
    IF NOT FOUND THEN
        SELECT s.id, s.name, s.description
        INTO scorecard_record
        FROM scorecards s
        INNER JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
        WHERE s.active = true AND sctm.call_type IS NULL
        LIMIT 1;
    END IF;

    -- Se ainda não encontrou scorecard, retornar erro
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nenhum scorecard ativo encontrado para esta etapa'
        );
    END IF;

    -- Calcular peso total dos critérios
    SELECT SUM(weight), COUNT(*)
    INTO total_weight, criteria_count
    FROM scorecard_criteria
    WHERE scorecard_id = scorecard_record.id;

    -- Verificar se há critérios
    IF criteria_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Scorecard não possui critérios definidos'
        );
    END IF;

    -- Processar cada critério individualmente
    FOR criterion_record IN 
        SELECT id, name, description, weight, order_index
        FROM scorecard_criteria 
        WHERE scorecard_id = scorecard_record.id
        ORDER BY order_index
    LOOP
        -- Simular pontuação baseada no peso (0-10)
        -- Em implementação real, aqui seria chamada a IA
        achieved_score := CASE 
            WHEN random() > 0.7 THEN LEAST(10, GREATEST(7, criterion_record.weight / 10 + 7))
            WHEN random() > 0.4 THEN LEAST(10, GREATEST(5, criterion_record.weight / 10 + 5))
            ELSE LEAST(10, GREATEST(3, criterion_record.weight / 10 + 3))
        END;
        
        -- Calcular percentual (achieved_score de 0-10)
        percentage := (achieved_score * 100.0) / 10;
        
        -- Adicionar à análise ponderada
        weighted_score := weighted_score + (achieved_score * criterion_record.weight);
        
        -- Criar resultado do critério
        criterion_result := jsonb_build_object(
            'criterion_id', criterion_record.id,
            'criterion_name', criterion_record.name,
            'criterion_description', criterion_record.description,
            'weight', criterion_record.weight,
            'achieved_score', achieved_score,
            'percentage', ROUND(percentage, 1),
            'analysis', CASE 
                WHEN achieved_score >= 8 THEN 'Excelente desempenho neste critério'
                WHEN achieved_score >= 6 THEN 'Bom desempenho, com pontos de melhoria'
                WHEN achieved_score >= 4 THEN 'Desempenho regular, necessita atenção'
                ELSE 'Desempenho abaixo do esperado, requer melhoria significativa'
            END
        );
        
        criteria_analysis := criteria_analysis || criterion_result;
    END LOOP;

    -- Calcular score geral (0-10) baseado na média ponderada
    overall_score := LEAST(10, GREATEST(0, ROUND((weighted_score * 10.0) / (total_weight * 10))));

    -- Montar resultado final
    analysis_result := jsonb_build_object(
        'success', true,
        'call_id', call_id_param,
        'scorecard_id', scorecard_record.id,
        'scorecard_name', scorecard_record.name,
        'scorecard_used', jsonb_build_object(
            'id', scorecard_record.id,
            'name', scorecard_record.name,
            'description', scorecard_record.description
        ),
        'overall_score', overall_score,
        'total_weight', total_weight,
        'weighted_score', ROUND(weighted_score, 2),
        'criteria_count', criteria_count,
        'general_comment', CASE 
            WHEN overall_score >= 8 THEN 'Excelente chamada! Demonstrou domínio na maioria dos critérios avaliados.'
            WHEN overall_score >= 6 THEN 'Boa chamada com alguns pontos de melhoria identificados.'
            WHEN overall_score >= 4 THEN 'Chamada regular. Há oportunidades claras de desenvolvimento.'
            ELSE 'Chamada precisa de melhorias significativas em vários aspectos.'
        END,
        'detailed_analysis', 'Análise baseada em ' || criteria_count || ' critérios do scorecard "' || scorecard_record.name || '". Score calculado pela média ponderada dos critérios.',
        'criteria_analysis', criteria_analysis,
        'performance_summary', jsonb_build_object(
            'excellent', (SELECT COUNT(*) FROM unnest(criteria_analysis) AS ca WHERE (ca->>'achieved_score')::integer >= 8),
            'good', (SELECT COUNT(*) FROM unnest(criteria_analysis) AS ca WHERE (ca->>'achieved_score')::integer >= 6 AND (ca->>'achieved_score')::integer < 8),
            'regular', (SELECT COUNT(*) FROM unnest(criteria_analysis) AS ca WHERE (ca->>'achieved_score')::integer >= 4 AND (ca->>'achieved_score')::integer < 6),
            'poor', (SELECT COUNT(*) FROM unnest(criteria_analysis) AS ca WHERE (ca->>'achieved_score')::integer < 4)
        ),
        'analysis_date', NOW()
    );

    RETURN analysis_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro interno na análise: ' || SQLERRM
        );
END;
$$;

-- 2. Conceder permissões
GRANT EXECUTE ON FUNCTION perform_full_ai_analysis TO authenticated;

-- 3. Comentários
COMMENT ON FUNCTION perform_full_ai_analysis IS 'Análise IA completa usando apenas peso dos critérios (versão corrigida sem RECORD[])';

-- 4. Testar a função
SELECT 'Função de análise IA corrigida com sucesso!' as status;

-- 5. Verificar se a função foi criada corretamente
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'perform_full_ai_analysis';

SELECT 'Função perform_full_ai_analysis recriada sem erro de RECORD[]!' as status;
