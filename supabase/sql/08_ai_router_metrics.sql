-- AI Router Metrics Table
-- Stores performance and usage metrics for AI router operations

CREATE TABLE IF NOT EXISTS public.ai_router_metrics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id TEXT,
  persona_id TEXT,
  router_mode TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  rag_ms INTEGER,
  web_ms INTEGER,
  llm_ms INTEGER,
  total_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate NUMERIC(12,6),
  status TEXT NOT NULL, -- 'success' | 'error' | 'timeout'
  cb_state TEXT,        -- circuit breaker state
  error_code TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_router_metrics_created_at ON public.ai_router_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_router_metrics_provider ON public.ai_router_metrics (provider);
CREATE INDEX IF NOT EXISTS idx_ai_router_metrics_status ON public.ai_router_metrics (status);
CREATE INDEX IF NOT EXISTS idx_ai_router_metrics_persona ON public.ai_router_metrics (persona_id);

-- RLS Policy (optional - for now grant to service_role only)
ALTER TABLE public.ai_router_metrics ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service_role for backend operations
GRANT INSERT, SELECT ON public.ai_router_metrics TO service_role;
GRANT USAGE ON SEQUENCE public.ai_router_metrics_id_seq TO service_role;

-- View for aggregated metrics (optional)
CREATE OR REPLACE VIEW public.ai_router_stats AS
SELECT 
  provider,
  router_mode,
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'success') AS successful_requests,
  COUNT(*) FILTER (WHERE status = 'error') AS failed_requests,
  AVG(total_ms) AS avg_total_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_ms) AS p50_total_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95_total_ms,
  AVG(llm_ms) AS avg_llm_ms,
  SUM(cost_estimate) AS total_cost
FROM public.ai_router_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY provider, router_mode, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

GRANT SELECT ON public.ai_router_stats TO service_role;
