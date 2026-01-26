-- 23_impersonation_audit.sql
-- Audit log for SuperAdmin impersonation links

CREATE TABLE IF NOT EXISTS public.impersonation_audit (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_impersonation_audit_created_at ON public.impersonation_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_admin_user_id ON public.impersonation_audit (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_target_user_id ON public.impersonation_audit (target_user_id);

ALTER TABLE public.impersonation_audit ENABLE ROW LEVEL SECURITY;

-- Only service role should write; SuperAdmin can read if needed
DROP POLICY IF EXISTS "Service role can insert impersonation audit" ON public.impersonation_audit;
CREATE POLICY "Service role can insert impersonation audit" ON public.impersonation_audit
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "SuperAdmin can view impersonation audit" ON public.impersonation_audit;
CREATE POLICY "SuperAdmin can view impersonation audit" ON public.impersonation_audit
  FOR SELECT USING (public.is_admin());

GRANT INSERT, SELECT ON public.impersonation_audit TO service_role;
GRANT USAGE ON SEQUENCE public.impersonation_audit_id_seq TO service_role;

COMMENT ON TABLE public.impersonation_audit IS 'Audit trail for SuperAdmin impersonation links';
