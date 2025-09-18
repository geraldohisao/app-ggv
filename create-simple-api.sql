CREATE OR REPLACE FUNCTION public.get_calls_with_filters_api(
  p_sdr text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  deal_id text,
  enterprise text,
  sdr_name text,
  sdr_email text,
  agent_id text,
  status text,
  status_voip text,
  duration integer,
  call_type text,
  direction text,
  from_number text,
  to_number text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.deal_id,
    COALESCE(c.insights->>'company', c.insights->>'enterprise', 'Empresa não informada') AS enterprise,
    COALESCE(c.sdr_name, c.agent_id) AS sdr_name,
    c.sdr_email,
    c.agent_id,
    c.status,
    c.status_voip,
    COALESCE(c.duration, 0) AS duration,
    c.call_type,
    c.direction,
    c.from_number,
    c.to_number,
    c.created_at
  FROM calls c
  WHERE
    (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
    AND (p_status IS NULL OR c.status_voip = p_status)
    AND (p_type IS NULL OR c.call_type = p_type)
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date   IS NULL OR c.created_at <= p_end_date)
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_calls_with_filters_api(
  text, text, text, timestamptz, timestamptz, integer, integer
) TO authenticated, anon;

