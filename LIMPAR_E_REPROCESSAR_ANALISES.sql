-- LIMPAR_E_REPROCESSAR_ANALISES.sql
-- Limpar análises "fake" e permitir reprocessamento com análise REAL

-- ===================================================================
-- ETAPA 1: BACKUP DAS ANÁLISES ATUAIS (SEGURANÇA)
-- ===================================================================

-- Criar tabela de backup
CREATE TABLE IF NOT EXISTS call_analysis_backup_fake AS 
SELECT * FROM call_analysis WHERE 1=0; -- Estrutura sem dados

-- Fazer backup das análises "fake" (analysis_type = 'ultra_fast')
INSERT INTO call_analysis_backup_fake
SELECT * FROM call_analysis
WHERE detailed_analysis->>'analysis_type' IN ('ultra_fast', 'simple_batch', 'minimal');

-- Verificar backup
SELECT COUNT(*) as backup_count FROM call_analysis_backup_fake;

-- ===================================================================
-- ETAPA 2: REMOVER ANÁLISES "FAKE" PARA PERMITIR REPROCESSAMENTO
-- ===================================================================

-- Remover análises automáticas/fake que têm score fixo
DELETE FROM call_analysis
WHERE detailed_analysis->>'analysis_type' IN ('ultra_fast', 'simple_batch', 'minimal', 'real_ai_analysis_v2')
   OR (detailed_analysis->>'auto_generated')::boolean = true
   OR final_grade = 8.0; -- Remove todas com nota 8.0 (provavelmente fake)

-- Verificar quantas foram removidas
SELECT 
    COUNT(*) as remaining_analyses,
    COUNT(CASE WHEN final_grade != 8.0 THEN 1 END) as non_fake_analyses
FROM call_analysis;

-- ===================================================================
-- ETAPA 3: VERIFICAR CHAMADAS ELEGÍVEIS PARA REPROCESSAMENTO
-- ===================================================================

-- Contar chamadas que agora precisam de análise (após limpeza)
WITH eligible_calls AS (
  SELECT c.id
  FROM calls c
  WHERE c.duration >= 180  -- >= 3 minutos
    AND c.transcription IS NOT NULL
    AND LENGTH(c.transcription) >= 100  -- >= 100 caracteres
    AND (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) >= 10  -- >= 10 segmentos
    AND NOT EXISTS (
      SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id
    )
)
SELECT COUNT(*) as calls_ready_for_real_analysis FROM eligible_calls;

-- Ver algumas amostras das chamadas que serão reprocessadas
SELECT 
  c.id,
  c.duration,
  c.duration_formated,
  LENGTH(c.transcription) as transcript_length,
  (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) as segments,
  c.created_at
FROM calls c
WHERE c.duration >= 180
  AND c.transcription IS NOT NULL
  AND LENGTH(c.transcription) >= 100
  AND (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) >= 10
  AND NOT EXISTS (SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id)
ORDER BY c.created_at DESC
LIMIT 10;

-- ===================================================================
-- ETAPA 4: VERIFICAR SE AS FUNÇÕES RPC NECESSÁRIAS EXISTEM
-- ===================================================================

-- Verificar se existe get_scorecard_smart (necessária para análise real)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'get_scorecard_smart'
        ) 
        THEN '✅ get_scorecard_smart existe'
        ELSE '❌ get_scorecard_smart NÃO existe - precisa ser criada'
    END as status_get_scorecard_smart;

-- Verificar se existe save_call_analysis (necessária para salvar)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'save_call_analysis'
        ) 
        THEN '✅ save_call_analysis existe'
        ELSE '❌ save_call_analysis NÃO existe - precisa ser criada'
    END as status_save_call_analysis;

-- ===================================================================
-- ETAPA 5: RESUMO
-- ===================================================================

SELECT '🧹 LIMPEZA CONCLUÍDA!' as status;
SELECT '📊 Análises fake removidas, banco pronto para reprocessamento REAL' as resultado;
SELECT '⚡ Agora use "Re-analisar Todas" para análise completa com IA' as proximos_passos;



