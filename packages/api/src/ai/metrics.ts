import { logger } from '@calls-mvp/shared';

export type MetricRecord = {
  requestId: string;
  personaId: string;
  routerMode: string;
  provider: string;
  model: string;
  ragMs: number;
  webMs: number;
  llmMs: number;
  totalMs: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  status: 'success' | 'error' | 'timeout';
  cbState: string;
  errorCode?: string;
  userId?: string;
};

// In-memory buffer for async metrics flushing
const metricsBuffer: MetricRecord[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;

let flushTimer: NodeJS.Timeout | null = null;

export function recordMetric(record: MetricRecord): void {
  metricsBuffer.push({
    ...record,
    costEstimate: estimateCost(record.provider, record.tokensIn, record.tokensOut)
  });
  
  // Flush if buffer is full
  if (metricsBuffer.length >= BUFFER_SIZE) {
    flushMetrics();
  } else if (!flushTimer) {
    // Set timer for periodic flush
    flushTimer = setTimeout(() => {
      flushMetrics();
    }, FLUSH_INTERVAL_MS);
  }
}

async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) return;
  
  const records = metricsBuffer.splice(0); // Clear buffer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  try {
    // Import Supabase client dynamically to avoid circular deps
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase config missing, logging metrics locally');
      records.forEach(record => logger.info(record, 'ai_router_metric'));
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('ai_router_metrics')
      .insert(records.map(r => ({
        request_id: r.requestId,
        persona_id: r.personaId,
        router_mode: r.routerMode,
        provider: r.provider,
        model: r.model,
        rag_ms: r.ragMs,
        web_ms: r.webMs,
        llm_ms: r.llmMs,
        total_ms: r.totalMs,
        tokens_in: r.tokensIn,
        tokens_out: r.tokensOut,
        cost_estimate: r.costEstimate,
        status: r.status,
        cb_state: r.cbState,
        error_code: r.errorCode,
        user_id: r.userId
      })));
    
    if (error) {
      logger.warn({ error: error.message, count: records.length }, 'failed_to_insert_metrics');
      // Fallback to local logging
      records.forEach(record => logger.info(record, 'ai_router_metric_fallback'));
    } else {
      logger.debug({ count: records.length }, 'metrics_flushed_to_db');
    }
    
  } catch (error: any) {
    logger.warn({ error: error.message, count: records.length }, 'metrics_flush_error');
    // Fallback to local logging
    records.forEach(record => logger.info(record, 'ai_router_metric_fallback'));
  }
}

function estimateCost(provider: string, tokensIn: number, tokensOut: number): number {
  // Rough cost estimates (update with real pricing)
  const pricing: Record<string, { input: number; output: number }> = {
    gemini: { input: 0.000125, output: 0.000375 }, // per 1K tokens
    deepseek: { input: 0.00014, output: 0.00028 }   // per 1K tokens
  };
  
  const rates = pricing[provider] || pricing.deepseek;
  return ((tokensIn / 1000) * rates.input) + ((tokensOut / 1000) * rates.output);
}

// Health endpoint data
export function getRouterHealth(): any {
  const { getProviderMetrics } = require('../config/ai.js');
  const metrics = getProviderMetrics();
  
  return {
    providers: metrics,
    bufferSize: metricsBuffer.length,
    lastFlush: flushTimer ? 'pending' : 'idle'
  };
}

// Graceful shutdown - flush remaining metrics
export async function shutdownMetrics(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  if (metricsBuffer.length > 0) {
    logger.info({ count: metricsBuffer.length }, 'flushing_metrics_on_shutdown');
    await flushMetrics();
  }
}
