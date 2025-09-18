CREATE OR REPLACE FUNCTION get_calls_paginated(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  duration_formated text,
  agent_id text,
  recording_url text,
  transcription text,
  call_type text,
  enterprise text,
  deal_id text,
  sdr_email text,
  person text,
  status_voip text,
  cadence text,
  pipeline text,
  created_at timestamptz,
  from_number text,
  to_number text,
  status text,
  direction text,
  total_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.duration_formated,
    c.agent_id,
    c.recording_url,
    c.transcription,
    c.call_type,
    c.enterprise,
    c.deal_id,
    c.sdr_email,
    c.person,
    c.status_voip,
    c.cadence,
    c.pipeline,
    c.created_at,
    c.from_number,
    c.to_number,
    c.status,
    c.direction,
    COUNT(*) OVER() as total_count
  FROM calls c
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

