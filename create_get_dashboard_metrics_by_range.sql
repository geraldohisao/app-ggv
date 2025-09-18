-- Nova função de métricas por intervalo explícito
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_by_range(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  total_calls integer,
  answered_calls integer,
  answered_rate numeric,
  avg_duration integer,
  total_sdrs integer,
  period_start timestamptz,
  period_end timestamptz
) AS $$
  WITH filtered AS (
    SELECT * FROM calls c
    WHERE c.created_at >= p_start_date
      AND c.created_at <= p_end_date
  ), agg AS (
    SELECT
      count(*)::int AS total_calls,
      count(*) FILTER (WHERE status_voip = 'normal_clearing')::int AS answered_calls,
      COALESCE(AVG(duration)::int, 0) AS avg_duration,
      COUNT(DISTINCT agent_id)::int AS total_sdrs
    FROM filtered
  )
  SELECT
    a.total_calls,
    a.answered_calls,
    CASE WHEN a.total_calls > 0
      THEN round((a.answered_calls::numeric / a.total_calls::numeric) * 100, 2)
      ELSE 0 END AS answered_rate,
    a.avg_duration,
    a.total_sdrs,
    p_start_date,
    p_end_date
  FROM agg a;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics_by_range(timestamptz, timestamptz) TO authenticated, anon;



