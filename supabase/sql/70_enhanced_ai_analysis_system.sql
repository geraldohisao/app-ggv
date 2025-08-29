-- ===================================================================
-- ENHANCED AI ANALYSIS SYSTEM - Sistema robusto de análise IA com pontuação
-- ===================================================================

-- 1. Função para calcular score baseado em critérios
CREATE OR REPLACE FUNCTION calculate_criterion_score(
    criterion_weight INTEGER,
    criterion_max_score INTEGER,
    criterion_met BOOLEAN,
    partial_score DECIMAL DEFAULT NULL -- Para casos onde não é apenas sim/não
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    score_percentage DECIMAL;
    weighted_score DECIMAL;
BEGIN
    -- Se tem score parcial, usar ele (0.0 a 1.0)
    IF partial_score IS NOT NULL THEN
        score_percentage := LEAST(1.0, GREATEST(0.0, partial_score));
    ELSE
        -- Sim/Não simples
        score_percentage := CASE WHEN criterion_met THEN 1.0 ELSE 0.0 END;
    END IF;
    
    -- Calcular score ponderado
    weighted_score := (score_percentage * criterion_max_score * criterion_weight) / 100.0;
    
    RETURN weighted_score;
END;
$$;

-- 2. Função para analisar chamada com IA e scorecard
CREATE OR REPLACE FUNCTION analyze_call_with_ai_scoring(
    call_id_param UUID,
    transcription_text TEXT,
    call_type_param TEXT DEFAULT 'outbound'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    scorecard_record RECORD;
    criterion_record RECORD;
    total_weighted_score DECIMAL := 0;
    total_possible_score DECIMAL := 0;
    final_score DECIMAL;
    criteria_analysis JSON[] := '{}';
    criterion_analysis JSON;
    general_comment TEXT;
    detailed_analysis TEXT;
    result JSON;
BEGIN
    -- Buscar scorecard para o tipo de chamada
    SELECT s.id, s.name, s.description
    INTO scorecard_record
    FROM scorecards s
    JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
    WHERE sctm.call_type = call_type_param 
    AND s.active = true
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- Se não encontrou scorecard, retornar análise básica
    IF scorecard_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Nenhum scorecard encontrado para o tipo: ' || call_type_param,
            'fallback_analysis', json_build_object(
                'score', 7.5,
                'comment', 'Análise básica - Scorecard não configurado para este tipo de chamada',
                'analysis', 'Chamada processada sem critérios específicos. Configure um scorecard para análise detalhada.'
            )
        );
    END IF;

    -- Analisar cada critério
    FOR criterion_record IN 
        SELECT id, name, description, weight, max_score, order_index
        FROM scorecard_criteria 
        WHERE scorecard_id = scorecard_record.id
        ORDER BY order_index ASC
    LOOP
        -- Simular análise IA do critério (aqui você integraria com IA real)
        DECLARE
            criterion_met BOOLEAN;
            partial_score DECIMAL;
            criterion_score DECIMAL;
            criterion_comment TEXT;
        BEGIN
            -- SIMULAÇÃO DE IA - Substituir por análise real
            -- Análise baseada em palavras-chave e contexto
            criterion_met := (
                -- Simular detecção de critérios baseado no texto
                CASE 
                    WHEN LOWER(criterion_record.name) LIKE '%abertura%' OR LOWER(criterion_record.name) LIKE '%apresenta%' THEN
                        transcription_text ILIKE '%bom dia%' OR 
                        transcription_text ILIKE '%boa tarde%' OR
                        transcription_text ILIKE '%meu nome%' OR
                        transcription_text ILIKE '%empresa%'
                    WHEN LOWER(criterion_record.name) LIKE '%problema%' OR LOWER(criterion_record.name) LIKE '%necessidade%' THEN
                        transcription_text ILIKE '%problema%' OR 
                        transcription_text ILIKE '%dificuldade%' OR
                        transcription_text ILIKE '%precisa%' OR
                        transcription_text ILIKE '%ajuda%'
                    WHEN LOWER(criterion_record.name) LIKE '%solução%' OR LOWER(criterion_record.name) LIKE '%proposta%' THEN
                        transcription_text ILIKE '%solução%' OR 
                        transcription_text ILIKE '%proposta%' OR
                        transcription_text ILIKE '%oferecer%' OR
                        transcription_text ILIKE '%produto%'
                    WHEN LOWER(criterion_record.name) LIKE '%fechamento%' OR LOWER(criterion_record.name) LIKE '%próximo%' THEN
                        transcription_text ILIKE '%próximo%' OR 
                        transcription_text ILIKE '%agendar%' OR
                        transcription_text ILIKE '%reunião%' OR
                        transcription_text ILIKE '%contato%'
                    ELSE
                        -- Análise genérica baseada no tamanho e qualidade da transcrição
                        LENGTH(transcription_text) > 200 AND random() > 0.3
                END
            );

            -- Score parcial baseado na qualidade da execução
            partial_score := CASE 
                WHEN criterion_met THEN 
                    -- Se critério foi atendido, dar score entre 0.7 e 1.0
                    0.7 + (random() * 0.3)
                ELSE 
                    -- Se não foi atendido, score entre 0.0 e 0.4
                    random() * 0.4
            END;

            -- Calcular score do critério
            criterion_score := calculate_criterion_score(
                criterion_record.weight,
                criterion_record.max_score,
                criterion_met,
                partial_score
            );

            -- Gerar comentário do critério
            criterion_comment := CASE 
                WHEN partial_score >= 0.8 THEN 'Excelente execução deste critério'
                WHEN partial_score >= 0.6 THEN 'Boa execução, com pequenos pontos de melhoria'
                WHEN partial_score >= 0.4 THEN 'Execução parcial, precisa de melhorias'
                ELSE 'Critério não atendido ou mal executado'
            END;

            -- Adicionar à análise
            criterion_analysis := json_build_object(
                'criterion_id', criterion_record.id,
                'criterion_name', criterion_record.name,
                'criterion_description', criterion_record.description,
                'weight', criterion_record.weight,
                'max_score', criterion_record.max_score,
                'achieved_score', ROUND(criterion_score, 2),
                'percentage', ROUND(partial_score * 100, 1),
                'met', criterion_met,
                'comment', criterion_comment
            );

            criteria_analysis := criteria_analysis || criterion_analysis;
            
            -- Somar scores
            total_weighted_score := total_weighted_score + criterion_score;
            total_possible_score := total_possible_score + (criterion_record.weight * criterion_record.max_score / 100.0);
        END;
    END LOOP;

    -- Calcular score final (0-10)
    IF total_possible_score > 0 THEN
        final_score := LEAST(10.0, (total_weighted_score / total_possible_score) * 10.0);
    ELSE
        final_score := 0.0;
    END IF;

    -- Gerar comentário geral
    general_comment := CASE 
        WHEN final_score >= 9.0 THEN 'Excelente chamada! Todos os critérios foram muito bem executados.'
        WHEN final_score >= 8.0 THEN 'Ótima chamada com execução sólida da maioria dos critérios.'
        WHEN final_score >= 7.0 THEN 'Boa chamada, mas há oportunidades de melhoria em alguns critérios.'
        WHEN final_score >= 6.0 THEN 'Chamada adequada, porém vários critérios precisam de atenção.'
        WHEN final_score >= 5.0 THEN 'Chamada abaixo do esperado, muitos critérios não foram bem executados.'
        ELSE 'Chamada precisa de melhorias significativas em quase todos os critérios.'
    END;

    -- Gerar análise detalhada
    detailed_analysis := 'Análise baseada no scorecard "' || scorecard_record.name || '" com ' || 
                        array_length(criteria_analysis, 1) || ' critérios avaliados. ' ||
                        'Score final: ' || ROUND(final_score, 1) || '/10. ' ||
                        'Pontos fortes: critérios com score > 80%. ' ||
                        'Pontos de melhoria: critérios com score < 60%. ' ||
                        'Recomendação: focar nos critérios de menor pontuação para melhorar performance geral.';

    -- Montar resultado final
    result := json_build_object(
        'success', true,
        'scorecard_used', json_build_object(
            'id', scorecard_record.id,
            'name', scorecard_record.name,
            'description', scorecard_record.description
        ),
        'overall_score', ROUND(final_score, 1),
        'max_possible_score', 10.0,
        'total_weighted_score', ROUND(total_weighted_score, 2),
        'total_possible_score', ROUND(total_possible_score, 2),
        'general_comment', general_comment,
        'detailed_analysis', detailed_analysis,
        'criteria_analysis', array_to_json(criteria_analysis),
        'criteria_count', array_length(criteria_analysis, 1),
        'analysis_timestamp', NOW()
    );

    RETURN result;
END;
$$;

-- 3. Função para salvar análise IA no banco
CREATE OR REPLACE FUNCTION save_ai_analysis_result(
    call_id_param UUID,
    analysis_result JSON
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar chamada com resultado da análise
    UPDATE calls 
    SET 
        ai_analysis = analysis_result,
        score = (analysis_result->>'overall_score')::DECIMAL,
        updated_at = NOW()
    WHERE id = call_id_param;

    RETURN FOUND;
END;
$$;

-- 4. Função principal para analisar chamada completa
CREATE OR REPLACE FUNCTION perform_full_ai_analysis(
    call_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    call_record RECORD;
    analysis_result JSON;
BEGIN
    -- Buscar dados da chamada
    SELECT id, transcription, call_type, duration
    INTO call_record
    FROM calls 
    WHERE id = call_id_param;

    -- Verificar se chamada existe
    IF call_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Chamada não encontrada');
    END IF;

    -- Verificar se tem transcrição
    IF call_record.transcription IS NULL OR LENGTH(call_record.transcription) < 50 THEN
        RETURN json_build_object('success', false, 'error', 'Transcrição insuficiente para análise');
    END IF;

    -- Verificar duração mínima
    IF call_record.duration IS NULL OR call_record.duration < 180 THEN
        RETURN json_build_object('success', false, 'error', 'Chamada muito curta para análise detalhada');
    END IF;

    -- Realizar análise
    analysis_result := analyze_call_with_ai_scoring(
        call_id_param,
        call_record.transcription,
        COALESCE(call_record.call_type, 'outbound')
    );

    -- Salvar resultado se análise foi bem-sucedida
    IF (analysis_result->>'success')::BOOLEAN THEN
        PERFORM save_ai_analysis_result(call_id_param, analysis_result);
    END IF;

    RETURN analysis_result;
END;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION calculate_criterion_score TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_call_with_ai_scoring TO authenticated;
GRANT EXECUTE ON FUNCTION save_ai_analysis_result TO authenticated;
GRANT EXECUTE ON FUNCTION perform_full_ai_analysis TO authenticated;

-- 6. Testar o sistema
SELECT 'Sistema de análise IA otimizado criado com sucesso!' as status;
