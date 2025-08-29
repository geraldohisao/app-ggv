-- ===================================================================
-- CALL ETAPA MANAGEMENT - Gerenciamento de etapas das chamadas
-- ===================================================================

-- 1. Função para editar etapa de uma chamada
CREATE OR REPLACE FUNCTION edit_call_etapa(
    call_id_param UUID,
    new_etapa TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_etapa TEXT;
    call_exists BOOLEAN;
BEGIN
    -- Verificar se a chamada existe e obter etapa atual
    SELECT 
        EXISTS(SELECT 1 FROM calls WHERE id = call_id_param),
        call_type
    INTO call_exists, old_etapa
    FROM calls 
    WHERE id = call_id_param;

    IF NOT call_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Chamada não encontrada'
        );
    END IF;

    -- Validar nova etapa (permitir NULL para indefinida)
    IF new_etapa IS NOT NULL AND trim(new_etapa) = '' THEN
        new_etapa := NULL;
    END IF;

    -- Atualizar etapa da chamada
    UPDATE calls 
    SET 
        call_type = new_etapa,
        updated_at = NOW()
    WHERE id = call_id_param;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Etapa da chamada atualizada com sucesso',
        'call_id', call_id_param,
        'old_etapa', COALESCE(old_etapa, 'indefinida'),
        'new_etapa', COALESCE(new_etapa, 'indefinida')
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao atualizar etapa: ' || SQLERRM
        );
END;
$$;

-- 2. Função para obter todas as etapas (incluindo indefinida)
CREATE OR REPLACE FUNCTION get_all_etapas_with_indefinida()
RETURNS TABLE (
    etapa_codigo TEXT,
    etapa_nome TEXT,
    quantidade_chamadas BIGINT,
    is_indefinida BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    -- Etapas definidas
    SELECT 
        call_type as etapa_codigo,
        format_etapa_name(call_type) as etapa_nome,
        COUNT(*) as quantidade_chamadas,
        false as is_indefinida
    FROM calls 
    WHERE call_type IS NOT NULL 
    GROUP BY call_type 
    
    UNION ALL
    
    -- Etapa indefinida
    SELECT 
        NULL as etapa_codigo,
        '❓ Indefinida' as etapa_nome,
        COUNT(*) as quantidade_chamadas,
        true as is_indefinida
    FROM calls 
    WHERE call_type IS NULL
    HAVING COUNT(*) > 0
    
    ORDER BY is_indefinida, quantidade_chamadas DESC;
$$;

-- 3. Atualizar função de busca de scorecard para incluir indefinida
CREATE OR REPLACE FUNCTION get_scorecard_by_call_type_with_indefinida(call_type_param TEXT)
RETURNS TABLE (
    scorecard_id UUID,
    scorecard_name TEXT,
    scorecard_description TEXT,
    criteria JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Primeiro, tentar buscar scorecard para a etapa específica
    IF call_type_param IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            s.id,
            s.name,
            s.description,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', sc.id,
                        'name', sc.name,
                        'description', sc.description,
                        'weight', sc.weight,
                        'order_index', sc.order_index
                    ) ORDER BY sc.order_index
                ) FILTER (WHERE sc.id IS NOT NULL),
                '[]'::jsonb
            ) as criteria
        FROM scorecards s
        INNER JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
        LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
        WHERE s.active = true 
        AND sctm.call_type = call_type_param
        GROUP BY s.id, s.name, s.description
        LIMIT 1;
        
        -- Se encontrou, retornar
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Se não encontrou ou é indefinida, buscar scorecard para indefinida
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'name', sc.name,
                    'description', sc.description,
                    'weight', sc.weight,
                    'order_index', sc.order_index
                ) ORDER BY sc.order_index
            ) FILTER (WHERE sc.id IS NOT NULL),
            '[]'::jsonb
        ) as criteria
    FROM scorecards s
    INNER JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
    LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
    WHERE s.active = true 
    AND sctm.call_type IS NULL  -- Scorecard para indefinida
    GROUP BY s.id, s.name, s.description
    LIMIT 1;
END;
$$;

-- 4. Função para vincular scorecard à etapa indefinida
CREATE OR REPLACE FUNCTION link_scorecard_to_indefinida(
    scorecard_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o scorecard existe
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE id = scorecard_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Scorecard não encontrado'
        );
    END IF;

    -- Remover vinculação anterior para indefinida (se existir)
    DELETE FROM scorecard_call_type_mapping 
    WHERE scorecard_id = scorecard_id_param AND call_type IS NULL;

    -- Adicionar nova vinculação para indefinida
    INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type)
    VALUES (scorecard_id_param, NULL);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Scorecard vinculado à etapa indefinida com sucesso'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Erro ao vincular scorecard: ' || SQLERRM
        );
END;
$$;

-- 5. Função para obter estatísticas de etapas
CREATE OR REPLACE FUNCTION get_etapas_statistics()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'total_calls', COUNT(*),
        'defined_etapas', COUNT(*) FILTER (WHERE call_type IS NOT NULL),
        'undefined_etapas', COUNT(*) FILTER (WHERE call_type IS NULL),
        'etapas_breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'etapa', COALESCE(call_type, 'indefinida'),
                    'count', count,
                    'percentage', ROUND((count * 100.0 / total_calls), 2)
                )
            )
            FROM (
                SELECT 
                    call_type,
                    COUNT(*) as count,
                    (SELECT COUNT(*) FROM calls) as total_calls
                FROM calls
                GROUP BY call_type
                ORDER BY count DESC
            ) etapa_counts
        )
    )
    FROM calls;
$$;

-- 6. Atualizar função format_etapa_name para incluir indefinida
CREATE OR REPLACE FUNCTION format_etapa_name(etapa_name TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN etapa_name = 'diagnostico' THEN '🔍 Diagnóstico'
        WHEN etapa_name = 'proposta' THEN '💼 Proposta'
        WHEN etapa_name = 'ligacao' THEN '📞 Ligação'
        WHEN etapa_name IS NULL THEN '❓ Indefinida'
        ELSE COALESCE(etapa_name, '❓ Indefinida')
    END;
$$;

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION edit_call_etapa TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_etapas_with_indefinida TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_by_call_type_with_indefinida TO authenticated;
GRANT EXECUTE ON FUNCTION link_scorecard_to_indefinida TO authenticated;
GRANT EXECUTE ON FUNCTION get_etapas_statistics TO authenticated;

-- 8. Comentários
COMMENT ON FUNCTION edit_call_etapa IS 'Edita a etapa de uma chamada específica';
COMMENT ON FUNCTION get_all_etapas_with_indefinida IS 'Retorna todas as etapas incluindo indefinida';
COMMENT ON FUNCTION get_scorecard_by_call_type_with_indefinida IS 'Busca scorecard por etapa com fallback para indefinida';
COMMENT ON FUNCTION link_scorecard_to_indefinida IS 'Vincula scorecard à etapa indefinida';
COMMENT ON FUNCTION get_etapas_statistics IS 'Estatísticas das etapas das chamadas';

-- 9. Verificar dados atuais
SELECT 'Verificando chamadas com etapa indefinida...' as status;

SELECT 
    'indefinida' as etapa,
    COUNT(*) as quantidade,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls)), 2) as percentual
FROM calls 
WHERE call_type IS NULL
UNION ALL
SELECT 
    COALESCE(call_type, 'indefinida') as etapa,
    COUNT(*) as quantidade,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls)), 2) as percentual
FROM calls 
WHERE call_type IS NOT NULL
GROUP BY call_type
ORDER BY quantidade DESC;

SELECT 'Funções de gerenciamento de etapas criadas com sucesso!' as status;
