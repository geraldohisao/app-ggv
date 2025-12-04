-- RESTAURAR_FUNCAO_ORIGINAL.sql
-- Restaurar a função perform_ultra_fast_ai_analysis que funcionava antes

DROP FUNCTION IF EXISTS public.perform_ultra_fast_ai_analysis(UUID);

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
      c.duration,
      c.transcription,
      length(COALESCE(c.transcription, '')) as transcript_length
    FROM public.calls c
    WHERE c.id = call_id_param
  ),
  best_match AS (
    SELECT s.id, s.name
    FROM public.scorecards s
    WHERE s.active = true
    ORDER BY s.created_at DESC
    LIMIT 1
  )
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
  SELECT
    cd.id,
    bm.id,
    bm.name,
    CASE 
      WHEN cd.transcript_length < 100 THEN 2.0
      WHEN cd.transcript_length < 500 THEN 5.0
      WHEN cd.transcript_length < 1000 THEN 7.0
      ELSE 8.0
    END as final_grade,
    CASE 
      WHEN cd.transcript_length < 100 THEN 20
      WHEN cd.transcript_length < 500 THEN 50
      WHEN cd.transcript_length < 1000 THEN 70
      ELSE 80
    END as overall_score,
    jsonb_build_object(
      'analysis_type', 'ultra_fast',
      'transcript_length', cd.transcript_length,
      'duration', cd.duration,
      'call_type', cd.call_type,
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
    overall_score = EXCLUDED.overall_score,
    detailed_analysis = EXCLUDED.detailed_analysis,
    updated_at = NOW()
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

GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO service_role;

-- Testar
SELECT perform_ultra_fast_ai_analysis('1315a30f-60ad-4ba8-b2e8-7efe45076088'::UUID);

SELECT '🔧 FUNÇÃO ORIGINAL RESTAURADA!' as status;
SELECT '📊 Esta é a versão que funcionava antes' as resultado;



