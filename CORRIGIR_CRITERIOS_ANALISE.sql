-- CORRIGIR_CRITERIOS_ANALISE.sql
-- 🔧 Ajustar critérios para análise em massa funcionar

-- ===================================================================
-- ETAPA 1: TESTAR CRITÉRIOS MAIS FLEXÍVEIS
-- ===================================================================

-- Verificar chamadas com critérios MAIS FLEXÍVEIS
WITH flexible_criteria AS (
    SELECT 
        id,
        duration,
        LENGTH(COALESCE(transcription, '')) as transcription_length,
        transcription IS NOT NULL as has_any_transcription,
        -- Critério mais flexível para status (aceitar qualquer chamada)
        CASE 
            WHEN duration > 0 THEN true  -- Qualquer duração > 0
            ELSE false
        END as is_valid_call,
        -- Critério mais flexível para duração (1 minuto ao invés de 3)
        CASE 
            WHEN duration >= 60 THEN true  -- 1 minuto ao invés de 3
            ELSE false
        END as is_over_1min,
        -- Critério mais flexível para transcrição (50 chars ao invés de 100)
        CASE 
            WHEN LENGTH(COALESCE(transcription, '')) >= 50 THEN true
            ELSE false
        END as has_basic_transcription,
        -- Critério mais flexível para segmentos (5 ao invés de 10)
        CASE 
            WHEN transcription IS NOT NULL 
                 AND LENGTH(transcription) > 50 
                 AND (LENGTH(transcription) - LENGTH(REPLACE(transcription, '.', ''))) >= 5 
            THEN true
            ELSE false
        END as has_basic_segments
    FROM calls
    WHERE duration > 0  -- Só chamadas com alguma duração
)
SELECT 
    COUNT(*) as total_calls_with_duration,
    COUNT(CASE WHEN is_valid_call THEN 1 END) as valid_calls,
    COUNT(CASE WHEN is_over_1min THEN 1 END) as over_1min_calls,
    COUNT(CASE WHEN has_any_transcription THEN 1 END) as with_any_transcription,
    COUNT(CASE WHEN has_basic_transcription THEN 1 END) as with_basic_transcription,
    COUNT(CASE WHEN has_basic_segments THEN 1 END) as with_basic_segments,
    COUNT(CASE WHEN is_valid_call AND is_over_1min AND has_basic_transcription AND has_basic_segments THEN 1 END) as eligible_with_flexible_criteria
FROM flexible_criteria;

-- ===================================================================
-- ETAPA 2: ATUALIZAR A FUNÇÃO unifiedBatchAnalysisService
-- ===================================================================

-- Vamos criar uma função temporária para testar critérios mais flexíveis
CREATE OR REPLACE FUNCTION public.get_calls_for_analysis_flexible()
RETURNS TABLE (
    id UUID,
    transcription TEXT,
    duration INTEGER,
    segments INTEGER,
    call_type TEXT,
    pipeline TEXT,
    cadence TEXT,
    enterprise TEXT,
    person TEXT,
    sdr TEXT,
    status_voip TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.transcription,
        c.duration,
        CASE 
            WHEN c.transcription IS NOT NULL 
            THEN (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', '')))
            ELSE 0
        END as segments,
        COALESCE(c.call_type, 'unknown') as call_type,
        COALESCE(c.insights->>'pipeline', 'Default') as pipeline,
        COALESCE(c.insights->>'cadence', 'Default') as cadence,
        COALESCE(c.insights->>'enterprise', c.insights->>'company', 'Empresa') as enterprise,
        COALESCE(c.insights->>'person', c.insights->>'person_name', 'Pessoa') as person,
        COALESCE(c.insights->>'sdr', c.agent_id, 'SDR') as sdr,
        COALESCE(c.insights->>'status_voip', 'normal_clearing') as status_voip
    FROM calls c
    WHERE 
        -- Critérios MUITO FLEXÍVEIS para teste
        c.duration >= 30  -- Mínimo 30 segundos
        AND c.transcription IS NOT NULL
        AND LENGTH(c.transcription) >= 20  -- Mínimo 20 caracteres
        -- Não verificar se já foi analisada (para teste)
    ORDER BY c.created_at DESC
    LIMIT 100;  -- Limitar para teste
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.get_calls_for_analysis_flexible() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_for_analysis_flexible() TO service_role;

-- ===================================================================
-- ETAPA 3: TESTAR A NOVA FUNÇÃO
-- ===================================================================

-- Contar quantas chamadas a nova função retorna
SELECT COUNT(*) as chamadas_elegiveis_flexivel
FROM get_calls_for_analysis_flexible();

-- Ver algumas amostras
SELECT id, duration, LENGTH(transcription) as transcription_length, segments, enterprise
FROM get_calls_for_analysis_flexible()
LIMIT 5;

-- ===================================================================
-- ETAPA 4: VERIFICAR SE SCORECARD EXISTE
-- ===================================================================

-- Garantir que existe pelo menos um scorecard ativo
DO $$
BEGIN
    -- Se não existir nenhum scorecard ativo, criar um básico
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE active = true) THEN
        INSERT INTO scorecards (id, name, active, criteria, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Scorecard Básico para Teste',
            true,
            '{"criteria": "basic test scorecard"}',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Scorecard básico criado para teste';
    ELSE
        RAISE NOTICE 'Scorecard ativo já existe';
    END IF;
END $$;

-- ===================================================================
-- ETAPA 5: RESUMO
-- ===================================================================

SELECT '🔧 CRITÉRIOS FLEXÍVEIS APLICADOS!' as status;
SELECT '📊 Agora teste o painel - deve mostrar chamadas elegíveis' as resultado;
SELECT '⚡ Se funcionar, podemos ajustar os critérios gradualmente' as proximos_passos;



