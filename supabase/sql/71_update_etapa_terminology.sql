-- ===================================================================
-- UPDATE ETAPA TERMINOLOGY - Atualizar terminologia para "Etapa da Ligação"
-- ===================================================================

-- 1. Atualizar comentários das funções para usar "etapa" ao invés de "call_type"
COMMENT ON FUNCTION get_real_call_types() IS 'Retorna etapas únicas da coluna call_type da tabela calls';
COMMENT ON FUNCTION get_scorecard_by_call_type(TEXT) IS 'Busca scorecard ativo para uma etapa específica da ligação';
COMMENT ON TABLE scorecard_call_type_mapping IS 'Mapeamento entre scorecards e etapas da ligação';

-- 2. Atualizar descrição da coluna call_type
COMMENT ON COLUMN calls.call_type IS 'Etapa da ligação (diagnostico, proposta, ligacao, etc.)';

-- 3. Verificar etapas existentes na base de dados
SELECT 
    call_type as etapa,
    COUNT(*) as quantidade_chamadas,
    CASE 
        WHEN call_type = 'diagnostico' THEN '🔍 Diagnóstico'
        WHEN call_type = 'proposta' THEN '💼 Proposta'
        WHEN call_type = 'ligacao' THEN '📞 Ligação'
        ELSE call_type
    END as etapa_formatada
FROM calls 
WHERE call_type IS NOT NULL 
GROUP BY call_type 
ORDER BY quantidade_chamadas DESC;

-- 4. Função para formatar nome da etapa
CREATE OR REPLACE FUNCTION format_etapa_name(etapa_name TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN etapa_name = 'diagnostico' THEN '🔍 Diagnóstico'
        WHEN etapa_name = 'proposta' THEN '💼 Proposta'
        WHEN etapa_name = 'ligacao' THEN '📞 Ligação'
        ELSE COALESCE(etapa_name, '❓ Indefinido')
    END;
$$;

-- 5. Função melhorada para obter etapas com formatação
CREATE OR REPLACE FUNCTION get_etapas_formatadas()
RETURNS TABLE (
    etapa_codigo TEXT,
    etapa_nome TEXT,
    quantidade_chamadas BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        call_type as etapa_codigo,
        format_etapa_name(call_type) as etapa_nome,
        COUNT(*) as quantidade_chamadas
    FROM calls 
    WHERE call_type IS NOT NULL 
    GROUP BY call_type 
    ORDER BY quantidade_chamadas DESC;
$$;

-- 6. Atualizar função de análise IA para usar terminologia de etapa
COMMENT ON FUNCTION analyze_call_with_ai_scoring(UUID, TEXT, TEXT) IS 
'Analisa chamada usando IA baseada no scorecard da etapa da ligação';

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION format_etapa_name TO authenticated;
GRANT EXECUTE ON FUNCTION get_etapas_formatadas TO authenticated;

-- 8. Verificar mapeamentos existentes
SELECT 
    s.name as scorecard_nome,
    array_agg(format_etapa_name(sctm.call_type)) as etapas_vinculadas
FROM scorecards s
LEFT JOIN scorecard_call_type_mapping sctm ON s.id = sctm.scorecard_id
WHERE s.active = true
GROUP BY s.id, s.name
ORDER BY s.name;

SELECT 'Terminologia atualizada para "Etapa da Ligação" com sucesso!' as status;
