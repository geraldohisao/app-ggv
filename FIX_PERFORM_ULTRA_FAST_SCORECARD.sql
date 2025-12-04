-- FIX_PERFORM_ULTRA_FAST_SCORECARD.sql
-- Corrige a função de análise rápida para usar scorecards.active (não is_active)
-- e garantir retorno de sucesso com upsert em call_analysis.

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
  _tlen INT;
  _result JSONB;
BEGIN
  -- Selecionar scorecard ativo; fallback para qualquer um
  SELECT id, name
  INTO _scorecard_id, _scorecard_name
  FROM public.scorecards
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF _scorecard_id IS NULL THEN
    SELECT id, name
    INTO _scorecard_id, _scorecard_name
    FROM public.scorecards
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF _scorecard_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nenhum scorecard disponível');
  END IF;

  -- Tamanho da transcrição
  SELECT length(coalesce(transcription, ''))
  INTO _tlen
  FROM public.calls
  WHERE id = call_id_param;

  IF _tlen IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Chamada não encontrada');
  END IF;

  -- Inserir/atualizar análise (ultra-rápida)
  INSERT INTO public.call_analysis (
    call_id,
    scorecard_id,
    scorecard_name,
    final_grade,
    detailed_analysis,
    created_at,
    updated_at
  )
  VALUES (
    call_id_param,
    _scorecard_id,
    _scorecard_name,
    CASE 
      WHEN _tlen < 100 THEN 2
      WHEN _tlen < 500 THEN 5
      WHEN _tlen < 1000 THEN 7
      ELSE 8
    END,
    jsonb_build_object(
      'analysis_type','ultra_fast',
      'transcript_length', _tlen,
      'auto_generated', true,
      'timestamp', now()
    ),
    now(),
    now()
  )
  ON CONFLICT (call_id)
  DO UPDATE SET
    final_grade = EXCLUDED.final_grade,
    detailed_analysis = EXCLUDED.detailed_analysis,
    updated_at = now()
  RETURNING jsonb_build_object(
    'success', true,
    'call_id', call_id,
    'overall_score', final_grade,
    'scorecard', jsonb_build_object('id', scorecard_id, 'name', scorecard_name)
  ) INTO _result;

  RETURN _result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO authenticated, service_role;

-- Fim





