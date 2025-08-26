-- 22_error_events.sql
-- Error events storage for client/server incidents, grouped by hash

CREATE TABLE IF NOT EXISTS public.error_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  incident_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  url TEXT,
  user_email TEXT,
  user_role TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  app_version TEXT,
  stack TEXT,
  component_stack TEXT,
  status_code INTEGER,
  context JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON public.error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_incident_hash ON public.error_events (incident_hash);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert (for client-side reporting) and read own events by email match
DROP POLICY IF EXISTS "Users can insert error events" ON public.error_events;
CREATE POLICY "Users can insert error events" ON public.error_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own error events" ON public.error_events;
CREATE POLICY "Users can view own error events" ON public.error_events
  FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR public.is_admin()
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_email
  );

-- Service role full access for server-side ingestion
GRANT INSERT, SELECT, UPDATE, DELETE ON public.error_events TO service_role;
GRANT USAGE ON SEQUENCE public.error_events_id_seq TO service_role;

COMMENT ON TABLE public.error_events IS 'Incidentes de erro client/server, agrupados por incident_hash';
COMMENT ON COLUMN public.error_events.incident_hash IS 'Hash estável para agrupar ocorrências similares';


