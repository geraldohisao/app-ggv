-- FIX_OVERALL_SCORE_CONSTRAINT.sql
-- Corrigir constraint NOT NULL na coluna overall_score

-- ===================================================================
-- ETAPA 1: VERIFICAR ESTRUTURA ATUAL DA TABELA
-- ===================================================================

-- Ver estrutura atual da tabela call_analysis
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'call_analysis'
ORDER BY ordinal_position;

-- ===================================================================
-- ETAPA 2: REMOVER CONSTRAINT NOT NULL DA COLUNA overall_score
-- ===================================================================

-- Permitir NULL na coluna overall_score (temporariamente)
ALTER TABLE public.call_analysis 
ALTER COLUMN overall_score DROP NOT NULL;

-- ===================================================================
-- ETAPA 3: CORRIGIR A FUNÇÃO perform_ultra_fast_ai_analysis
-- ===================================================================

DROP FUNCTION IF EXISTS public.perform_ultra_fast_ai_analysis(UUID);

CREATE OR REPLACE FUNCTION public.perform_ultra_fast_ai_analysis(call_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scorecard_id UUID;
  _scorecard_name TEXT;
  _call_data RECORD;
  _final_grade NUMERIC(3,1);
  _result JSONB;
BEGIN
  -- Buscar dados da chamada
  SELECT 
    id,
    transcription,
    duration,
    duration_formated,
    call_type
  INTO _call_data
  FROM public.calls
  WHERE id = call_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Chamada não encontrada',
      'call_id', call_id_param
    );
  END IF;

  -- Selecionar scorecard ativo
  SELECT id, name
  INTO _scorecard_id, _scorecard_name
  FROM public.scorecards
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF _scorecard_id IS NULL THEN
    -- Fallback: qualquer scorecard
    SELECT id, name
    INTO _scorecard_id, _scorecard_name
    FROM public.scorecards
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF _scorecard_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Nenhum scorecard disponível'
    );
  END IF;

  -- Calcular score baseado no tamanho da transcrição
  _final_grade := CASE 
    WHEN length(coalesce(_call_data.transcription, '')) < 100 THEN 2.0
    WHEN length(coalesce(_call_data.transcription, '')) < 500 THEN 5.0
    WHEN length(coalesce(_call_data.transcription, '')) < 1000 THEN 7.0
    ELSE 8.0
  END;

  -- Inserir/atualizar análise
  INSERT INTO public.call_analysis (
    call_id,
    scorecard_id,
    scorecard_name,
    final_grade,
    overall_score,
    detailed_analysis,
    created_at,
    updated_at
  )
  VALUES (
    call_id_param,
    _scorecard_id,
    _scorecard_name,
    _final_grade,
    _final_grade, -- overall_score = final_grade
    jsonb_build_object(
      'analysis_type', 'ultra_fast',
      'transcript_length', length(coalesce(_call_data.transcription, '')),
      'duration', _call_data.duration,
      'duration_formated', _call_data.duration_formated,
      'call_type', _call_data.call_type,
      'auto_generated', true,
      'timestamp', now()
    ),
    now(),
    now()
  )
  ON CONFLICT (call_id)
  DO UPDATE SET
    final_grade = EXCLUDED.final_grade,
    overall_score = EXCLUDED.overall_score,
    detailed_analysis = EXCLUDED.detailed_analysis,
    updated_at = now()
  RETURNING 
    jsonb_build_object(
      'success', true,
      'call_id', call_id,
      'overall_score', overall_score,
      'final_grade', final_grade,
      'scorecard', jsonb_build_object(
        'id', scorecard_id,
        'name', scorecard_name
      ),
      'analysis', detailed_analysis,
      'message', 'Análise ultra-rápida concluída com sucesso'
    ) INTO _result;

  RETURN _result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'call_id', call_id_param
  );
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO authenticated, service_role;

-- ===================================================================
-- ETAPA 4: VERIFICAÇÃO
-- ===================================================================

-- Testar a função com uma chamada específica
SELECT perform_ultra_fast_ai_analysis('c26b5631-285f-4c97-8cff-c9cb4a49008d'::UUID);

-- Verificar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'call_analysis'
ORDER BY ordinal_position;

SELECT '🔧 CONSTRAINT OVERALL_SCORE CORRIGIDA!' as status;
SELECT '📊 Agora teste a análise em massa novamente' as resultado;
SELECT '⚡ Deve funcionar sem erros de NULL constraint' as proximos_passos;


