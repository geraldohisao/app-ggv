-- 39_calls_system_fixed_ambiguous.sql
-- CORREÇÃO: Erro de coluna ambígua "sdr_name"
-- Execute apenas esta correção após o script principal

-- =========================================
-- CORREÇÃO DA FUNÇÃO get_sdr_score_chart
-- =========================================

-- Remover função com problema
DROP FUNCTION IF EXISTS public.get_sdr_score_chart(INTEGER);

-- Recriar função corrigida
CREATE OR REPLACE FUNCTION public.get_sdr_score_chart(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  sdr_name TEXT,
  avg_score NUMERIC,
  call_count BIGINT,
  score_trend TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH period_calls AS (
    SELECT 
      c.id,
      c.agent_id,
      c.created_at,
      get_sdr_display_name(c.agent_id) as computed_sdr_name,
      CASE 
        WHEN c.scorecard ? 'finalScore' THEN (c.scorecard->>'finalScore')::INTEGER
        WHEN c.scorecard ? 'total_score' THEN (c.scorecard->>'total_score')::INTEGER
        WHEN c.scorecard ? 'score' THEN (c.scorecard->>'score')::INTEGER
        ELSE NULL
      END as computed_score
    FROM calls c
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
      AND c.agent_id IS NOT NULL
  )
  SELECT 
    pc.computed_sdr_name as sdr_name,
    ROUND(AVG(pc.computed_score) FILTER (WHERE pc.computed_score IS NOT NULL), 1) as avg_score,
    COUNT(*) as call_count,
    CASE 
      WHEN AVG(pc.computed_score) FILTER (WHERE pc.computed_score IS NOT NULL) >= 85 THEN 'excellent'
      WHEN AVG(pc.computed_score) FILTER (WHERE pc.computed_score IS NOT NULL) >= 70 THEN 'good'
      WHEN AVG(pc.computed_score) FILTER (WHERE pc.computed_score IS NOT NULL) >= 50 THEN 'average'
      ELSE 'needs_improvement'
    END as score_trend
  FROM period_calls pc
  WHERE pc.computed_sdr_name != 'SDR não identificado'
  GROUP BY pc.computed_sdr_name
  HAVING COUNT(*) >= 3 -- Mínimo 3 chamadas para aparecer no gráfico
  ORDER BY avg_score DESC NULLS LAST, call_count DESC;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_score_chart(INTEGER) TO authenticated, service_role;

-- Testar função corrigida
SELECT 'SDR Score Chart Test (Fixed):' as test, COUNT(*) as sdr_count FROM get_sdr_score_chart(14);
