-- fix_ultra_fast_analysis_robust.sql
-- Objetivo: corrigir 0 sucessos na análise em lote garantindo:
-- 1) UPSERT por call_id funcione (índice único)
-- 2) Seleção de scorecard SEMPRE retorna um ativo (fallback)
-- 3) Logs claros no retorno em caso de falha

-- 1) Garantir índice/unique para ON CONFLICT (call_id)
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

-- 2) Recriar função perform_ultra_fast_ai_analysis com fallback de scorecard
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
      c.pipeline,
      c.cadence,
      c.duration,
      c.transcription,
      length(COALESCE(c.transcription, '')) as transcript_length
    FROM public.calls c
    WHERE c.id = call_id_param
  ),
  best_match AS (
    -- tentar match por call_type/pipeline/cadence
    SELECT 
      s.id,
      s.name,
      s.description,
      (
        (CASE WHEN cd.call_type = ANY(COALESCE(s.target_call_types, ARRAY[]::text[])) THEN 10 ELSE 0 END) +
        (CASE WHEN cd.pipeline IS NOT NULL AND cd.pipeline = ANY(COALESCE(s.target_pipelines, ARRAY[]::text[])) THEN 5 ELSE 0 END) +
        (CASE WHEN cd.cadence IS NOT NULL AND cd.cadence = ANY(COALESCE(s.target_cadences, ARRAY[]::text[])) THEN 3 ELSE 0 END)
      ) + 1 AS match_score
    FROM public.scorecards s
    CROSS JOIN call_data cd
    WHERE s.active = true
    ORDER BY match_score DESC, s.created_at DESC
    LIMIT 1
  ),
  scorecard_selection AS (
    -- fallback: se não houver scorecard ativo configurado, pega qualquer ativo
    SELECT * FROM best_match
    UNION ALL
    SELECT s.id, s.name, s.description, 1 AS match_score
    FROM public.scorecards s
    WHERE s.active = true AND NOT EXISTS (SELECT 1 FROM best_match)
    ORDER BY match_score DESC
    LIMIT 1
  ),
  criteria_analysis AS (
    SELECT 
      sc.id as criterion_id,
      sc.name,
      sc.description,
      sc.weight,
      CASE
        WHEN cd.transcript_length > 1000 AND 
             (cd.transcription ILIKE '%' || substring(sc.name, 1, 5) || '%' OR
              cd.transcription ILIKE ANY(ARRAY['%apresent%', '%objetivo%', '%problema%', '%solução%']))
        THEN sc.weight
        WHEN cd.transcript_length > 500 THEN ROUND(sc.weight * 0.7)
        WHEN cd.transcript_length > 200 THEN ROUND(sc.weight * 0.5)
        ELSE ROUND(sc.weight * 0.3)
      END as achieved_score
    FROM scorecard_selection ss
    JOIN public.scorecard_criteria sc ON ss.id = sc.scorecard_id
    CROSS JOIN call_data cd
    ORDER BY sc.order_index
  ),
  summary AS (
    SELECT 
      COUNT(*) as criteria_count,
      COALESCE(SUM(weight),0) as total_weight,
      COALESCE(SUM(achieved_score),0) as total_achieved,
      CASE 
        WHEN COALESCE(SUM(weight),0) > 0 
          THEN ROUND((COALESCE(SUM(achieved_score),0)::NUMERIC / NULLIF(SUM(weight),0)::NUMERIC) * 10)
        ELSE 0 
      END as overall_score
    FROM criteria_analysis
  )
  SELECT jsonb_build_object(
    'success', true,
    'call_id', cd.id,
    'scorecard', jsonb_build_object(
      'id', ss.id,
      'name', ss.name,
      'description', ss.description,
      'match_score', ss.match_score
    ),
    'overall_score', s.overall_score,
    'total_weight', s.total_weight,
    'weighted_score', s.total_achieved,
    'criteria_count', s.criteria_count
  ) INTO result
  FROM call_data cd, scorecard_selection ss, summary s;

  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sem scorecard ativo ou chamada inexistente'
    );
  END IF;

  -- Persistir resultado (UPSERT por call_id)
  INSERT INTO public.call_analysis (
    call_id, scorecard_id, ai_status, final_grade, analysis_data, created_at
  )
  VALUES (
    call_id_param,
    (result->'scorecard'->>'id')::UUID,
    'completed',
    (result->>'overall_score')::INTEGER,
    result,
    NOW()
  )
  ON CONFLICT ON CONSTRAINT uq_call_analysis_call_id
  DO UPDATE SET
    scorecard_id = EXCLUDED.scorecard_id,
    ai_status = EXCLUDED.ai_status,
    final_grade = EXCLUDED.final_grade,
    analysis_data = EXCLUDED.analysis_data,
    updated_at = NOW();

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro na análise: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_ultra_fast_ai_analysis(UUID) TO authenticated;

SELECT '✅ Fix aplicado: UPSERT garantido e fallback de scorecard' as status;


