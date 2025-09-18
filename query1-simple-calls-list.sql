CREATE OR REPLACE FUNCTION get_calls_simple()
RETURNS TABLE (
  id uuid,
  deal_id text,
  company text,
  sdr_name text,
  agent_id text,
  status text,
  status_voip text,
  duration integer,
  call_type text,
  from_number text,
  to_number text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.deal_id,
    COALESCE(c.insights->>'company', 'Empresa não informada')::text as company,
    COALESCE(c.sdr_name, c.agent_id)::text as sdr_name,
    c.agent_id,
    c.status,
    c.status_voip,
    COALESCE(c.duration, 0) as duration,
    c.call_type,
    c.from_number,
    c.to_number,
    c.created_at
  FROM calls c
  ORDER BY c.created_at DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

