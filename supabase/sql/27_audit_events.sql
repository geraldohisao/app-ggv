-- 27_audit_events.sql
-- Audit events storage for comprehensive activity tracking
-- Supports frontend events, backend events, and database triggers

-- ============================================================
-- TYPES
-- ============================================================

-- Event severity levels
DO $$ BEGIN
  CREATE TYPE audit_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event source types
DO $$ BEGIN
  CREATE TYPE audit_source AS ENUM ('frontend', 'netlify', 'db_trigger', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event identification
  event_type TEXT NOT NULL,
  severity audit_severity NOT NULL DEFAULT 'info',
  source audit_source NOT NULL DEFAULT 'frontend',
  
  -- Actor (who performed the action)
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  actor_impersonated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Subject (what was affected)
  subject_type TEXT,  -- e.g., 'sprint', 'checkin', 'user', 'okr', 'calendar_event'
  subject_id TEXT,    -- e.g., sprint UUID, user ID, etc.
  
  -- Request context
  request_id TEXT,    -- Correlation ID for tracing
  ip_address TEXT,
  user_agent TEXT,
  url TEXT,
  
  -- Additional data
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps for tracking changes
  CONSTRAINT valid_event_type CHECK (event_type ~ '^[a-z][a-z0-9_\.]+$')
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON public.audit_events (severity);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_user_id ON public.audit_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_email ON public.audit_events (actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_events_subject ON public.audit_events (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id ON public.audit_events (request_id);

-- GIN index for JSONB queries on metadata
CREATE INDEX IF NOT EXISTS idx_audit_events_metadata ON public.audit_events USING GIN (metadata);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit events
DROP POLICY IF EXISTS "Admins can view audit events" ON public.audit_events;
CREATE POLICY "Admins can view audit events" ON public.audit_events
  FOR SELECT
  USING (public.is_admin());

-- Service role has full access (for backend ingestion)
DROP POLICY IF EXISTS "Service role full access audit" ON public.audit_events;
CREATE POLICY "Service role full access audit" ON public.audit_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users can insert (for frontend events via RPC)
-- Using a security definer function instead for better control
DROP POLICY IF EXISTS "Users can insert via function" ON public.audit_events;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT ON public.audit_events TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.audit_events TO service_role;
GRANT USAGE ON SEQUENCE public.audit_events_id_seq TO service_role;

-- ============================================================
-- SECURITY DEFINER FUNCTION FOR FRONTEND INGESTION
-- ============================================================

-- Allowlist of event types that can be logged from frontend
CREATE OR REPLACE FUNCTION public.get_allowed_audit_event_types()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY[
    -- Authentication events
    'auth.login',
    'auth.logout',
    'auth.session_expired',
    
    -- Impersonation events
    'impersonation.start',
    'impersonation.stop',
    
    -- OKR events
    'okr.created',
    'okr.updated',
    'okr.deleted',
    'kr.created',
    'kr.updated',
    'kr.deleted',
    
    -- Sprint events
    'sprint.created',
    'sprint.updated',
    'sprint.deleted',
    'sprint.status_changed',
    
    -- Checkin events
    'checkin.created',
    'checkin.updated',
    'checkin.submitted',
    
    -- Calendar integration events
    'calendar.sync_started',
    'calendar.sync_completed',
    'calendar.sync_failed',
    'calendar.event_created',
    'calendar.event_updated',
    'calendar.event_deleted',
    
    -- User management events
    'user.role_changed',
    'user.department_changed',
    'user.deactivated',
    'user.reactivated',
    
    -- Diagnostic events
    'diagnostic.started',
    'diagnostic.completed',
    'diagnostic.shared',
    
    -- Call analysis events
    'call.analyzed',
    'call.feedback_submitted',
    
    -- Integration events
    'integration.connected',
    'integration.disconnected',
    'integration.error',
    
    -- Admin actions
    'admin.settings_changed',
    'admin.bulk_action'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to insert audit event with validation (callable from frontend)
CREATE OR REPLACE FUNCTION public.insert_audit_event(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_subject_type TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_event_id BIGINT;
  v_allowed_types TEXT[];
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get user email and role from profiles
  SELECT email, role INTO v_user_email, v_user_role
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Validate event type against allowlist
  v_allowed_types := public.get_allowed_audit_event_types();
  
  IF NOT (p_event_type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Event type not allowed: %', p_event_type;
  END IF;
  
  -- Validate severity
  IF p_severity NOT IN ('info', 'warning', 'critical') THEN
    p_severity := 'info';
  END IF;
  
  -- Sanitize metadata (remove sensitive keys)
  p_metadata := p_metadata - ARRAY['password', 'token', 'secret', 'api_key', 'access_token', 'refresh_token', 'authorization'];
  
  -- Insert the event
  INSERT INTO public.audit_events (
    event_type,
    severity,
    source,
    actor_user_id,
    actor_email,
    actor_role,
    subject_type,
    subject_id,
    metadata
  ) VALUES (
    p_event_type,
    p_severity::audit_severity,
    'frontend'::audit_source,
    v_user_id,
    v_user_email,
    v_user_role,
    p_subject_type,
    p_subject_id,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================
-- HELPER FUNCTION FOR BACKEND/SERVICE ROLE INGESTION
-- ============================================================

-- Full insert function for service role (no restrictions)
CREATE OR REPLACE FUNCTION public.insert_audit_event_full(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_source TEXT DEFAULT 'netlify',
  p_actor_user_id UUID DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_actor_impersonated_by UUID DEFAULT NULL,
  p_subject_type TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event_id BIGINT;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('info', 'warning', 'critical') THEN
    p_severity := 'info';
  END IF;
  
  -- Validate source
  IF p_source NOT IN ('frontend', 'netlify', 'db_trigger', 'system') THEN
    p_source := 'system';
  END IF;
  
  -- Insert the event
  INSERT INTO public.audit_events (
    event_type,
    severity,
    source,
    actor_user_id,
    actor_email,
    actor_role,
    actor_impersonated_by,
    subject_type,
    subject_id,
    request_id,
    ip_address,
    user_agent,
    url,
    metadata
  ) VALUES (
    p_event_type,
    p_severity::audit_severity,
    p_source::audit_source,
    p_actor_user_id,
    p_actor_email,
    p_actor_role,
    p_actor_impersonated_by,
    p_subject_type,
    p_subject_id,
    p_request_id,
    p_ip_address,
    p_user_agent,
    p_url,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_audit_event_full(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================
-- QUERY HELPERS
-- ============================================================

-- Function to get audit events with pagination and filters
CREATE OR REPLACE FUNCTION public.get_audit_events(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_event_type TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_subject_type TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  created_at TIMESTAMPTZ,
  event_type TEXT,
  severity audit_severity,
  source audit_source,
  actor_user_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  actor_impersonated_by UUID,
  subject_type TEXT,
  subject_id TEXT,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  url TEXT,
  metadata JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  v_offset := (p_page - 1) * p_limit;
  
  -- Count total matching records
  SELECT COUNT(*) INTO v_total
  FROM public.audit_events ae
  WHERE 
    (p_event_type IS NULL OR ae.event_type = p_event_type)
    AND (p_severity IS NULL OR ae.severity = p_severity::audit_severity)
    AND (p_source IS NULL OR ae.source = p_source::audit_source)
    AND (p_actor_email IS NULL OR ae.actor_email ILIKE '%' || p_actor_email || '%')
    AND (p_subject_type IS NULL OR ae.subject_type = p_subject_type)
    AND (p_subject_id IS NULL OR ae.subject_id = p_subject_id)
    AND (p_date_from IS NULL OR ae.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ae.created_at <= p_date_to)
    AND (p_search IS NULL OR (
      ae.event_type ILIKE '%' || p_search || '%'
      OR ae.actor_email ILIKE '%' || p_search || '%'
      OR ae.subject_type ILIKE '%' || p_search || '%'
      OR ae.subject_id ILIKE '%' || p_search || '%'
    ));
  
  RETURN QUERY
  SELECT 
    ae.id,
    ae.created_at,
    ae.event_type,
    ae.severity,
    ae.source,
    ae.actor_user_id,
    ae.actor_email,
    ae.actor_role,
    ae.actor_impersonated_by,
    ae.subject_type,
    ae.subject_id,
    ae.request_id,
    ae.ip_address,
    ae.user_agent,
    ae.url,
    ae.metadata,
    v_total
  FROM public.audit_events ae
  WHERE 
    (p_event_type IS NULL OR ae.event_type = p_event_type)
    AND (p_severity IS NULL OR ae.severity = p_severity::audit_severity)
    AND (p_source IS NULL OR ae.source = p_source::audit_source)
    AND (p_actor_email IS NULL OR ae.actor_email ILIKE '%' || p_actor_email || '%')
    AND (p_subject_type IS NULL OR ae.subject_type = p_subject_type)
    AND (p_subject_id IS NULL OR ae.subject_id = p_subject_id)
    AND (p_date_from IS NULL OR ae.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ae.created_at <= p_date_to)
    AND (p_search IS NULL OR (
      ae.event_type ILIKE '%' || p_search || '%'
      OR ae.actor_email ILIKE '%' || p_search || '%'
      OR ae.subject_type ILIKE '%' || p_search || '%'
      OR ae.subject_id ILIKE '%' || p_search || '%'
    ))
  ORDER BY ae.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_events(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- ============================================================
-- STATS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_audit_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_events BIGINT,
  events_by_type JSONB,
  events_by_severity JSONB,
  events_by_source JSONB,
  top_actors JSONB,
  events_by_hour JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  v_since := NOW() - (p_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      JSONB_OBJECT_AGG(
        COALESCE(ae.event_type, 'unknown'),
        COALESCE(type_counts.cnt, 0)
      ) FILTER (WHERE ae.event_type IS NOT NULL) as by_type,
      JSONB_BUILD_OBJECT(
        'info', COUNT(*) FILTER (WHERE ae.severity = 'info'),
        'warning', COUNT(*) FILTER (WHERE ae.severity = 'warning'),
        'critical', COUNT(*) FILTER (WHERE ae.severity = 'critical')
      ) as by_severity,
      JSONB_BUILD_OBJECT(
        'frontend', COUNT(*) FILTER (WHERE ae.source = 'frontend'),
        'netlify', COUNT(*) FILTER (WHERE ae.source = 'netlify'),
        'db_trigger', COUNT(*) FILTER (WHERE ae.source = 'db_trigger'),
        'system', COUNT(*) FILTER (WHERE ae.source = 'system')
      ) as by_source
    FROM public.audit_events ae
    LEFT JOIN LATERAL (
      SELECT ae2.event_type, COUNT(*) as cnt
      FROM public.audit_events ae2
      WHERE ae2.created_at >= v_since
      GROUP BY ae2.event_type
    ) type_counts ON type_counts.event_type = ae.event_type
    WHERE ae.created_at >= v_since
  ),
  top_actors_cte AS (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT('email', actor_email, 'count', cnt)
      ORDER BY cnt DESC
    ) as actors
    FROM (
      SELECT actor_email, COUNT(*) as cnt
      FROM public.audit_events
      WHERE created_at >= v_since AND actor_email IS NOT NULL
      GROUP BY actor_email
      ORDER BY cnt DESC
      LIMIT 10
    ) t
  ),
  hourly_cte AS (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT('hour', hour_bucket, 'count', cnt)
      ORDER BY hour_bucket
    ) as hourly
    FROM (
      SELECT DATE_TRUNC('hour', created_at) as hour_bucket, COUNT(*) as cnt
      FROM public.audit_events
      WHERE created_at >= v_since
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour_bucket
    ) t
  )
  SELECT 
    COALESCE(s.total, 0),
    COALESCE(s.by_type, '{}'::JSONB),
    COALESCE(s.by_severity, '{}'::JSONB),
    COALESCE(s.by_source, '{}'::JSONB),
    COALESCE(ta.actors, '[]'::JSONB),
    COALESCE(h.hourly, '[]'::JSONB)
  FROM stats s
  CROSS JOIN top_actors_cte ta
  CROSS JOIN hourly_cte h;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_stats(INTEGER) TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.audit_events IS 'Comprehensive audit trail for all user and system actions';
COMMENT ON COLUMN public.audit_events.event_type IS 'Dot-separated event identifier (e.g., auth.login, sprint.created)';
COMMENT ON COLUMN public.audit_events.severity IS 'Event severity: info, warning, or critical';
COMMENT ON COLUMN public.audit_events.source IS 'Origin of the event: frontend, netlify, db_trigger, or system';
COMMENT ON COLUMN public.audit_events.actor_impersonated_by IS 'If actor is being impersonated, this is the real admin user ID';
COMMENT ON COLUMN public.audit_events.request_id IS 'Unique identifier for request tracing/correlation';
COMMENT ON COLUMN public.audit_events.metadata IS 'Additional event-specific data (JSONB)';

COMMENT ON FUNCTION public.insert_audit_event IS 'Insert audit event from frontend (validated against allowlist)';
COMMENT ON FUNCTION public.insert_audit_event_full IS 'Insert audit event from backend/service role (no restrictions)';
COMMENT ON FUNCTION public.get_audit_events IS 'Query audit events with pagination and filters (admin only)';
COMMENT ON FUNCTION public.get_audit_stats IS 'Get audit event statistics for dashboard (admin only)';

-- Success message
SELECT 'audit_events table and functions created successfully!' as status;
