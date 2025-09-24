-- DIAGNOSTICAR_DADOS_CHAMADAS.sql
-- 🔍 Investigar por que a análise em massa está zerada

-- ===================================================================
-- ETAPA 1: VERIFICAR ESTRUTURA DA TABELA CALLS
-- ===================================================================

-- Ver todas as colunas da tabela calls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'calls'
ORDER BY ordinal_position;

-- ===================================================================
-- ETAPA 2: VERIFICAR DADOS REAIS DAS CHAMADAS
-- ===================================================================

-- Total de chamadas
SELECT COUNT(*) as total_chamadas FROM calls;

-- Verificar status das chamadas
SELECT 
    status,
    COUNT(*) as quantidade
FROM calls 
GROUP BY status 
ORDER BY quantidade DESC;

-- Verificar se existe status_voip nos insights
SELECT 
    COUNT(*) as total_com_insights,
    COUNT(CASE WHEN insights->>'status_voip' IS NOT NULL THEN 1 END) as com_status_voip,
    COUNT(CASE WHEN insights->>'status_voip' = 'normal_clearing' THEN 1 END) as normal_clearing
FROM calls;

-- Verificar durações
SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN duration >= 180 THEN 1 END) as acima_3min,
    AVG(duration) as duracao_media,
    MAX(duration) as duracao_maxima,
    MIN(duration) as duracao_minima
FROM calls;

-- Verificar transcrições
SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN transcription IS NOT NULL THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN LENGTH(transcription) >= 100 THEN 1 END) as transcricao_valida,
    AVG(LENGTH(transcription)) as tamanho_medio_transcricao
FROM calls;

-- ===================================================================
-- ETAPA 3: VERIFICAR CHAMADAS ELEGÍVEIS PARA ANÁLISE
-- ===================================================================

-- Chamadas que atendem TODOS os critérios atuais
WITH eligible_calls AS (
    SELECT 
        id,
        duration,
        LENGTH(transcription) as transcription_length,
        insights->>'status_voip' as status_voip,
        CASE 
            WHEN insights->>'status_voip' = 'normal_clearing' THEN true
            ELSE false
        END as is_answered,
        CASE 
            WHEN duration >= 180 THEN true
            ELSE false
        END as is_over_3min,
        CASE 
            WHEN LENGTH(transcription) >= 100 THEN true
            ELSE false
        END as has_transcription,
        CASE 
            WHEN transcription IS NOT NULL AND LENGTH(transcription) > 100 
                 AND (LENGTH(transcription) - LENGTH(REPLACE(transcription, '.', ''))) >= 10 
            THEN true
            ELSE false
        END as has_min_segments
    FROM calls
    WHERE transcription IS NOT NULL
)
SELECT 
    COUNT(*) as total_calls_with_transcription,
    COUNT(CASE WHEN is_answered THEN 1 END) as answered_calls,
    COUNT(CASE WHEN is_over_3min THEN 1 END) as over_3min_calls,
    COUNT(CASE WHEN has_transcription THEN 1 END) as with_valid_transcription,
    COUNT(CASE WHEN has_min_segments THEN 1 END) as with_min_segments,
    COUNT(CASE WHEN is_answered AND is_over_3min AND has_transcription AND has_min_segments THEN 1 END) as fully_eligible
FROM eligible_calls;

-- ===================================================================
-- ETAPA 4: VERIFICAR ANÁLISES EXISTENTES
-- ===================================================================

-- Verificar se tabela call_analysis existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'call_analysis'
        ) 
        THEN 'Tabela call_analysis existe'
        ELSE 'Tabela call_analysis NÃO existe'
    END as status_tabela;

-- Se existe, contar análises
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'call_analysis'
    ) THEN
        RAISE NOTICE 'Contando análises existentes...';
        PERFORM (SELECT COUNT(*) FROM call_analysis);
    ELSE
        RAISE NOTICE 'Tabela call_analysis não existe - criando...';
    END IF;
END $$;

-- ===================================================================
-- ETAPA 5: CRIAR TABELA call_analysis SE NÃO EXISTIR
-- ===================================================================

CREATE TABLE IF NOT EXISTS call_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    scorecard_id UUID,
    scorecard_name TEXT,
    final_grade NUMERIC(3,1),
    detailed_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(call_id)
);

-- Habilitar RLS
ALTER TABLE call_analysis ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
DROP POLICY IF EXISTS "Users can view call analysis" ON call_analysis;
CREATE POLICY "Users can view call analysis" ON call_analysis
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para service_role
DROP POLICY IF EXISTS "Service role can manage call analysis" ON call_analysis;
CREATE POLICY "Service role can manage call analysis" ON call_analysis
    FOR ALL USING (auth.role() = 'service_role');

-- ===================================================================
-- ETAPA 6: VERIFICAR SCORECARDS
-- ===================================================================

-- Verificar se existem scorecards ativos
SELECT 
    COUNT(*) as total_scorecards,
    COUNT(CASE WHEN active THEN 1 END) as active_scorecards
FROM scorecards;

-- Listar scorecards disponíveis
SELECT id, name, active, created_at
FROM scorecards
ORDER BY active DESC, created_at DESC
LIMIT 5;

-- ===================================================================
-- ETAPA 7: RESUMO FINAL
-- ===================================================================

SELECT '🔍 DIAGNÓSTICO CONCLUÍDO!' as status;
SELECT '📊 Verifique os resultados acima para entender por que está zerado' as proximos_passos;
SELECT '🔧 Execute as correções necessárias baseado no diagnóstico' as acao_necessaria;
