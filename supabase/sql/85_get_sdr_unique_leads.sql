-- =========================================
-- FUNÇÃO: Ranking de Leads Únicos por SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.get_sdr_unique_leads(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  sdr_id TEXT,
  sdr_name TEXT,
  unique_leads BIGINT,
  total_calls BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH sdr_data AS (
    SELECT
      -- SDR ID normalizado
      COALESCE(
        p.email_voip,
        CASE
          WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
            REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
          ELSE
            LOWER(TRIM(c.agent_id))
        END
      ) AS normalized_sdr_id,
      -- Nome do SDR
      COALESCE(
        p.full_name,
        REGEXP_REPLACE(
          INITCAP(REPLACE(SPLIT_PART(
            COALESCE(
              p.email_voip,
              CASE
                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                  REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                  LOWER(TRIM(c.agent_id))
              END
            ), '@', 1), '.', ' ')),
          '^\d+-', '', 'g'
        )
      ) AS sdr_name_clean,
      c.deal_id,
      c.id as call_id,
      c.created_at
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    WHERE
      c.created_at >= NOW() - INTERVAL '1 day' * p_days
      AND c.agent_id IS NOT NULL
      AND TRIM(c.agent_id) != ''
      AND c.deal_id IS NOT NULL
      AND TRIM(c.deal_id) != ''
  )
  SELECT
    sd.normalized_sdr_id as sdr_id,
    sd.sdr_name_clean as sdr_name,
    COUNT(DISTINCT sd.deal_id) as unique_leads,
    COUNT(sd.call_id) as total_calls
  FROM sdr_data sd
  GROUP BY sd.normalized_sdr_id, sd.sdr_name_clean
  HAVING COUNT(DISTINCT sd.deal_id) > 0
  ORDER BY unique_leads DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sdr_unique_leads(INTEGER) TO authenticated, anon, service_role;
