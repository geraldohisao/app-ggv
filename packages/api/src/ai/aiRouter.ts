import pTimeout from 'p-timeout';
import { AI_CFG, updateProviderMetrics, getProviderMetrics, ProviderMetrics } from '../config/ai.js';
import { LLMProvider, GenParams, GenResult } from './providers/base.js';
import { GeminiProvider } from './providers/gemini.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { validateJson } from '../lib/jsonSchema.js';
import { logger } from '@calls-mvp/shared';

type Circuit = { fails: number; openedAt?: number };
const circuits: Record<string, Circuit> = { gemini: { fails: 0 }, deepseek: { fails: 0 } };

function circuitOpen(name: string) {
  const c = circuits[name];
  if (!c.openedAt) return false;
  return (Date.now() - (c.openedAt as number)) < AI_CFG.cbWindowMs;
}
function markFailure(name: string) {
  const c = circuits[name]; c.fails++;
  if (c.fails >= AI_CFG.cbThreshold) c.openedAt = Date.now();
}
function markSuccess(name: string) { circuits[name] = { fails: 0, openedAt: undefined }; }

const primary: LLMProvider = GeminiProvider;
const secondary: LLMProvider = DeepSeekProvider;

function selectProviders(): LLMProvider[] {
  if (AI_CFG.mode === 'primary_fallback') return [primary, secondary];
  
  const metrics = getProviderMetrics();
  const providers = [
    { provider: primary, metrics: metrics.gemini },
    { provider: secondary, metrics: metrics.deepseek }
  ];
  
  if (AI_CFG.mode === 'cheapest') {
    // Sort by cost per token (ascending)
    providers.sort((a, b) => a.metrics.costPerToken - b.metrics.costPerToken);
    return providers.map(p => p.provider);
  }
  
  if (AI_CFG.mode === 'balanced') {
    // Score = 0.4*latency + 0.3*errorRate + 0.3*cost (normalized)
    const maxLatency = Math.max(...providers.map(p => p.metrics.latencyP50));
    const maxCost = Math.max(...providers.map(p => p.metrics.costPerToken));
    
    providers.forEach(p => {
      const normalizedLatency = p.metrics.latencyP50 / maxLatency;
      const normalizedCost = p.metrics.costPerToken / maxCost;
      (p as any).score = 0.4 * normalizedLatency + 0.3 * p.metrics.errorRate + 0.3 * normalizedCost;
    });
    
    providers.sort((a, b) => (a as any).score - (b as any).score);
    return providers.map(p => p.provider);
  }
  
  // Fallback to primary_fallback
  return [primary, secondary];
}

async function callWithPolicies(pv: LLMProvider, params: GenParams): Promise<GenResult> {
  const providerTimeout = pv.name() === 'gemini' ? AI_CFG.geminiTimeoutMs : AI_CFG.deepseekTimeoutMs;
  const startTime = Date.now();
  
  const res = await pTimeout(pv.generate(params), { milliseconds: providerTimeout, message: 'timeout' })
    .catch((e: any) => ({ ok: false, provider: pv.name(), model: '', error: { message: e?.message ?? 'timeout', retriable: true }} as GenResult));
  
  const latency = Date.now() - startTime;
  const tokens = estimateTokens(params.prompt) + (res.ok ? estimateTokens(res.rawText || '') : 0);
  
  // Update metrics
  updateProviderMetrics(pv.name(), latency, res.ok, tokens);
  
  if (!res.ok) {
    markFailure(pv.name());
    logger.warn({ provider: pv.name(), err: res.error, mode: AI_CFG.mode, latency }, 'ai_router_provider_error');
  } else {
    markSuccess(pv.name());
  }
  return res;
}

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

export async function generateDiagnosis(params: GenParams): Promise<GenResult> {
  const providers = selectProviders();

  let lastErr: GenResult | null = null;
  for (const pv of providers) {
    if (circuitOpen(pv.name())) continue;
    for (let attempt = 0; attempt <= AI_CFG.retryMax; attempt++) {
      const res = await callWithPolicies(pv, params);
      if (res.ok) {
        if (params.responseMimeType === 'application/json' && params.responseSchema) {
          const val = validateJson(res.json ?? res.rawText, params.responseSchema);
          if (!val.ok) {
            lastErr = { ...res, ok: false, error: { message: `schema_validation_fail: ${val.error}`, retriable: false } };
            logger.warn({ provider: pv.name(), error: val.error }, 'ai_router_schema_validation_failed');
            break;
          }
        }
        logger.info({ provider: pv.name(), model: res.model }, 'ai_router_success');
        return res;
      }
      lastErr = res;
      if (!res.error?.retriable) break;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return lastErr ?? { ok: false, provider: 'gemini', model: '', error: { message: 'no_provider_available' } };
}


