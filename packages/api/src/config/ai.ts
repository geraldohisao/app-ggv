export const AI_CFG = {
  mode: (process.env.AI_ROUTER_MODE ?? 'primary_fallback') as 'primary_fallback' | 'balanced' | 'cheapest',
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
  retryMax: Number(process.env.AI_RETRY_MAX ?? 2),
  cbWindowMs: Number(process.env.AI_CB_WINDOW ?? 60000),
  cbThreshold: Number(process.env.AI_CB_THRESHOLD ?? 3),
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 15000),
  deepseekTimeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 12000),
  cheapnessBias: Number(process.env.AI_CHEAPNESS_BIAS ?? 0.2)
};

export type ProviderMetrics = {
  latencyP50: number;
  latencyP95: number;
  errorRate: number;
  costPerToken: number;
  lastUpdated: number;
};

// In-memory metrics store (TODO: move to Redis/DB)
const providerMetrics: Record<string, ProviderMetrics> = {
  gemini: { latencyP50: 2000, latencyP95: 4000, errorRate: 0.05, costPerToken: 0.0001, lastUpdated: Date.now() },
  deepseek: { latencyP50: 1500, latencyP95: 3000, errorRate: 0.08, costPerToken: 0.00005, lastUpdated: Date.now() }
};

export function updateProviderMetrics(provider: string, latency: number, success: boolean, tokens: number): void {
  const metrics = providerMetrics[provider];
  if (!metrics) return;
  
  // Simple moving average for latency
  metrics.latencyP50 = (metrics.latencyP50 * 0.9) + (latency * 0.1);
  metrics.latencyP95 = Math.max(metrics.latencyP95 * 0.95, latency);
  
  // Update error rate
  const successRate = success ? 1 : 0;
  metrics.errorRate = (metrics.errorRate * 0.9) + ((1 - successRate) * 0.1);
  
  metrics.lastUpdated = Date.now();
}

export function getProviderMetrics(): Record<string, ProviderMetrics> {
  return { ...providerMetrics };
}


