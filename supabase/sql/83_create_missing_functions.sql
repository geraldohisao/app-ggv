-- ===================================================================
-- CREATE MISSING FUNCTIONS - Criar funções que estão faltando
-- ===================================================================

-- 1. Função get_all_etapas_with_indefinida (estava faltando)
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
        CASE 
            WHEN call_type = 'diagnostico' THEN '🔍 Diagnóstico'
            WHEN call_type = 'proposta' THEN '💼 Proposta'
            WHEN call_type = 'ligacao' THEN '📞 Ligação'
            ELSE call_type
        END as etapa_nome,
        COUNT(*) as quantidade_chamadas,
        false as is_indefinida
    FROM calls 
    WHERE call_type IS NOT NULL 
    GROUP BY call_type 
    
    UNION ALL
    
    -- Etapa indefinida
    SELECT 
        'indefinida' as etapa_codigo,
        '❓ Indefinida' as etapa_nome,
        COUNT(*) as quantidade_chamadas,
        true as is_indefinida
    FROM calls 
    WHERE call_type IS NULL
    HAVING COUNT(*) > 0
    
    ORDER BY is_indefinida, quantidade_chamadas DESC;
$$;

-- 2. Função edit_call_etapa (pode estar faltando também)
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
    
    -- Converter 'indefinida' para NULL
    IF new_etapa = 'indefinida' THEN
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

-- 3. Função get_real_call_types (pode estar sendo usada)
CREATE OR REPLACE FUNCTION get_real_call_types()
RETURNS TABLE (call_type TEXT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT DISTINCT c.call_type
    FROM calls c
    WHERE c.call_type IS NOT NULL
    ORDER BY c.call_type;
$$;

-- 4. Função format_etapa_name (utilitária)
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

-- 5. Função get_scorecard_by_call_type_with_indefinida (para IA)
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
    IF call_type_param IS NOT NULL AND call_type_param != 'indefinida' THEN
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

-- 6. Conceder permissões para todas as funções
GRANT EXECUTE ON FUNCTION get_all_etapas_with_indefinida TO authenticated;
GRANT EXECUTE ON FUNCTION edit_call_etapa TO authenticated;
GRANT EXECUTE ON FUNCTION get_real_call_types TO authenticated;
GRANT EXECUTE ON FUNCTION format_etapa_name TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_by_call_type_with_indefinida TO authenticated;

-- 7. Testar as funções criadas
SELECT 'Testando get_all_etapas_with_indefinida:' as teste;
SELECT * FROM get_all_etapas_with_indefinida() LIMIT 5;

SELECT 'Testando get_real_call_types:' as teste;
SELECT * FROM get_real_call_types() LIMIT 5;

SELECT 'Testando format_etapa_name:' as teste;
SELECT 
    format_etapa_name('diagnostico') as diagnostico,
    format_etapa_name('proposta') as proposta,
    format_etapa_name('ligacao') as ligacao,
    format_etapa_name(NULL) as indefinida;

-- 8. Verificar se todas as funções foram criadas
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN (
    'get_all_etapas_with_indefinida',
    'edit_call_etapa',
    'get_real_call_types',
    'format_etapa_name',
    'get_scorecard_by_call_type_with_indefinida'
)
ORDER BY proname;

SELECT 'Todas as funções faltantes foram criadas com sucesso!' as status;
