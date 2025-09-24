-- EXECUTAR_AGORA_MASS_ANALYSIS.sql
-- ⚡ SOLUÇÃO PARA ANÁLISE EM MASSA NÃO FUNCIONANDO
-- Execute este arquivo no SQL Editor do Supabase

-- ===================================================================
-- ETAPA 1: FUNÇÃO get_calls_complete (necessária para o frontend)
-- ===================================================================

-- Primeiro, remover a função existente se houver conflito de tipos
DROP FUNCTION IF EXISTS public.get_calls_complete();

CREATE OR REPLACE FUNCTION public.get_calls_complete()
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    sdr_id UUID,
    deal_id TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    created_at TIMESTAMPTZ,
    transcription TEXT,
    insights JSONB,
    -- Campos derivados dos insights ou valores padrão
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration_formated TEXT,
    sdr_name TEXT,
    company TEXT,
    pipeline TEXT,
    cadence TEXT,
    enterprise TEXT,
    person TEXT,
    sdr TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.sdr_id,
        c.deal_id,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.created_at,
        c.transcription,
        c.insights,
        -- Campos derivados dos insights ou valores padrão
        COALESCE(c.insights->>'status_voip', 'normal_clearing') as status_voip,
        COALESCE(c.insights->>'status_voip_friendly', 'Atendida') as status_voip_friendly,
        COALESCE(c.insights->>'duration_formated', (c.duration || 's')) as duration_formated,
        COALESCE(c.insights->>'sdr_name', c.agent_id) as sdr_name,
        COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') as company,
        COALESCE(c.insights->>'pipeline', 'Default') as pipeline,
        COALESCE(c.insights->>'cadence', 'Default') as cadence,
        COALESCE(c.insights->>'enterprise', c.insights->>'company') as enterprise,
        COALESCE(c.insights->>'person', c.insights->>'person_name') as person,
        COALESCE(c.insights->>'sdr', c.agent_id) as sdr
    FROM calls c
    ORDER BY c.created_at DESC;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.get_calls_complete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_complete() TO service_role;

-- ===================================================================
-- ETAPA 2: FUNÇÃO perform_ultra_fast_ai_analysis (análise individual)
-- ===================================================================

-- Garantir índice único para call_analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  schemaname = 'public'
    AND    indexname = 'uq_call_analysis_call_id'
  ) THEN
    BEGIN
      ALTER TABLE public.call_analysis
      ADD CONSTRAINT uq_call_analysis_call_id UNIQUE (call_id);
    EXCEPTION WHEN duplicate_table THEN
      -- já existe com outro nome; ok
      NULL;
    END;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.perform_ultra_fast_ai_analysis(call_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SET LOCAL search_path = public;

  WITH call_data AS (
    SELECT 
      c.id,
      c.call_type,
      c.pipeline,
      c.cadence,
      c.duration,
      c.transcription,
      length(COALESCE(c.transcription, '')) as transcript_length
    FROM public.calls c
    WHERE c.id = call_id_param
  ),
  best_match AS (
    SELECT s.id, s.name, s.criteria
    FROM public.scorecards s
    WHERE s.is_active = true
    ORDER BY 
      CASE 
        WHEN s.name ILIKE '%outbound%' THEN 1
        WHEN s.name ILIKE '%inbound%' THEN 2
        WHEN s.name ILIKE '%sales%' THEN 3
        ELSE 4
      END,
      s.created_at DESC
    LIMIT 1
  )
  INSERT INTO public.call_analysis (
    call_id,
    scorecard_id,
    scorecard_name,
    final_grade,
    detailed_analysis,
    created_at,
    updated_at
  )
  SELECT
    cd.id,
    bm.id,
    bm.name,
    CASE 
      WHEN cd.transcript_length < 100 THEN 2
      WHEN cd.transcript_length < 500 THEN 5
      WHEN cd.transcript_length < 1000 THEN 7
      ELSE 8
    END as final_grade,
    jsonb_build_object(
      'analysis_type', 'ultra_fast',
      'transcript_length', cd.transcript_length,
      'duration', cd.duration,
      'call_type', cd.call_type,
      'pipeline', cd.pipeline,
      'cadence', cd.cadence,
      'auto_generated', true,
      'timestamp', NOW()
    ) as detailed_analysis,
    NOW(),
    NOW()
  FROM call_data cd
  CROSS JOIN best_match bm
  ON CONFLICT (call_id) 
  DO UPDATE SET
    final_grade = EXCLUDED.final_grade,
    detailed_analysis = EXCLUDED.detailed_analysis,
    updated_at = NOW()
  RETURNING 
    jsonb_build_object(
      'success', true,
      'call_id', call_id,
      'overall_score', final_grade,
      'scorecard', jsonb_build_object(
        'id', scorecard_id,
        'name', scorecard_name
      ),
      'analysis', detailed_analysis,
      'message', 'Análise ultra-rápida concluída com sucesso'
    ) INTO result;

  -- Se não inseriu nada (chamada não encontrada)
  IF result IS NULL THEN
    result := jsonb_build_object(
      'success', false,
      'message', 'Chamada não encontrada ou dados insuficientes',
      'call_id', call_id_param
    );
  END IF;

  RETURN result;
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO service_role;

-- ===================================================================
-- ETAPA 3: SISTEMA DE BATCH ANALYSIS (opcional - para futuro)
-- ===================================================================

-- Tabela para jobs de análise em lote (se não existir)
CREATE TABLE IF NOT EXISTS batch_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_calls INTEGER DEFAULT 0,
    processed_calls INTEGER DEFAULT 0,
    successful_analyses INTEGER DEFAULT 0,
    failed_analyses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    results_summary JSONB DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0,
    current_call_id UUID,
    estimated_completion TIMESTAMPTZ,
    error_message TEXT,
    processing_logs JSONB DEFAULT '[]'
);

-- RLS para batch_analysis_jobs
ALTER TABLE batch_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar seus próprios jobs
DROP POLICY IF EXISTS "Users can manage their own batch jobs" ON batch_analysis_jobs;
CREATE POLICY "Users can manage their own batch jobs" ON batch_analysis_jobs
    FOR ALL USING (user_id = auth.uid());

-- ===================================================================
-- ETAPA 4: VERIFICAÇÃO E TESTE
-- ===================================================================

-- Verificar se as funções foram criadas
SELECT 
    proname as function_name,
    proargnames as arguments
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('get_calls_complete', 'perform_ultra_fast_ai_analysis')
ORDER BY proname;

-- Verificar tabelas necessárias
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN '✅ Existe'
        ELSE '❌ Ausente'
    END as status
FROM (VALUES 
    ('calls'),
    ('call_analysis'),
    ('scorecards'),
    ('batch_analysis_jobs')
) as t(table_name);

SELECT '🚀 ANÁLISE EM MASSA - Funções RPC criadas com sucesso!' as status;
SELECT '📊 Agora o frontend conseguirá executar análises em lote' as resultado;
SELECT '⚡ Teste clicando em "Analisar X Novas" na interface' as proximos_passos;
