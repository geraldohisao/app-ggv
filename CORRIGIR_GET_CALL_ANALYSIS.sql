-- 🔧 CORRIGIR FUNÇÃO get_call_analysis PARA RETORNAR DADOS COMPLETOS
-- A função estava retornando arrays vazios

-- ===============================================================
-- ETAPA 1: Ver dados reais na tabela call_analysis
-- ===============================================================

SELECT 
    'DADOS REAIS DA ANÁLISE' as info,
    id,
    call_id,
    final_grade,
    general_feedback,
    strengths,
    improvements, 
    criteria_analysis,
    jsonb_pretty(criteria_analysis) as criterios_formatados
FROM call_analysis 
WHERE id = '15fa4fe7-3581-47f8-855e-7afc58af0933';

-- ===============================================================
-- ETAPA 2: CORRIGIR FUNÇÃO get_call_analysis
-- ===============================================================

CREATE OR REPLACE FUNCTION public.get_call_analysis(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    scorecard_id UUID,
    scorecard_name TEXT,
    overall_score INTEGER,
    max_possible_score INTEGER,
    final_grade NUMERIC,
    general_feedback TEXT,
    strengths JSONB,
    improvements JSONB,
    criteria_analysis JSONB,
    confidence NUMERIC,
    analysis_created_at TIMESTAMPTZ,
    scorecard_used JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ca.id,
        ca.call_id,
        ca.scorecard_id,
        sc.name as scorecard_name,
        ca.overall_score,
        ca.max_possible_score,
        ca.final_grade,
        ca.general_feedback,
        ca.strengths,
        ca.improvements,
        ca.criteria_analysis,
        ca.confidence,
        ca.created_at as analysis_created_at,
        jsonb_build_object(
            'id', ca.scorecard_id,
            'name', sc.name,
            'description', sc.description
        ) as scorecard_used
    FROM call_analysis ca
    LEFT JOIN scorecards sc ON sc.id = ca.scorecard_id
    WHERE ca.call_id = p_call_id
    ORDER BY ca.created_at DESC
    LIMIT 1;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.get_call_analysis(UUID) TO authenticated, service_role;

-- ===============================================================
-- ETAPA 3: TESTAR A FUNÇÃO CORRIGIDA
-- ===============================================================

SELECT 
    'TESTE DA FUNÇÃO CORRIGIDA' as info,
    id,
    final_grade,
    general_feedback,
    strengths,
    improvements,
    criteria_analysis,
    scorecard_used
FROM get_call_analysis('f41b1529-9a89-4742-add0-eafbf6bb405e'::uuid);

-- ===============================================================
-- ETAPA 4: VERIFICAR SE OS DADOS ESTÃO CORRETOS NO BANCO
-- ===============================================================

SELECT 
    'VERIFICAÇÃO DOS DADOS SALVOS' as info,
    ca.id,
    ca.final_grade,
    ca.general_feedback IS NOT NULL as tem_feedback,
    jsonb_array_length(ca.strengths) as qtd_pontos_fortes,
    jsonb_array_length(ca.improvements) as qtd_melhorias,
    jsonb_array_length(ca.criteria_analysis) as qtd_criterios,
    ca.created_at
FROM call_analysis ca
WHERE ca.call_id = 'f41b1529-9a89-4742-add0-eafbf6bb405e'::uuid
ORDER BY ca.created_at DESC
LIMIT 1;

