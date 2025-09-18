-- Criar RPC simples para listar chamadas (igual rankings fazem)
CREATE OR REPLACE FUNCTION public.get_calls_list(
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  deal_id text,
  enterprise text,
  sdr_name text,
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
  ORDER BY c.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_calls_list(integer) TO authenticated, anon;

