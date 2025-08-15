import { getAppSetting } from '../../../services/supabaseService';
import { searchGoogleCse } from './googleCse';
import { tavilySearch } from './tavily';
import { addSample, getSummary } from '../../../src/utils/metricsBuffer';

export type WebSource = {
  title: string;
  url: string;
  snippet: string; // resumo curto (1–3 frases)
  provider: 'google_cse' | 'serpapi' | 'tavily';
};

export type WebSearchConfig = {
  enabled: boolean;
  hint?: string;        // WEB_CONTEXT_HINT
  topK: number;         // WEB_TOPK (default 2)
  timeoutMs: number;    // WEB_TIMEOUT_MS (default 5000)
  provider: 'google_cse' | 'serpapi' | 'tavily';
  apiKey?: string;      // G_CSE_API_KEY
  cx?: string;          // G_CSE_CX
};

const defaults: WebSearchConfig = {
  enabled: false,
  hint: '',
  topK: 2,
  timeoutMs: 5000,
  provider: 'google_cse',
  apiKey: undefined,
  cx: undefined,
};

let WEB_DEBUG = false;
export function enableWebDebug(v: boolean): void { WEB_DEBUG = !!v; }

function dbg(...args: any[]) {
  if (WEB_DEBUG || (import.meta as any)?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug.apply(console, args);
  }
}

export function normalizeSettingString(v: any): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof v.apiKey === 'string') return v.apiKey;
  if (v && typeof v === 'object' && typeof v.value === 'string') return v.value;
  return '';
}

async function loadConfig(): Promise<WebSearchConfig> {
  try {
    const [enabled, hint, topK, timeoutMs, apiKey, cx, provider] = await Promise.all([
      getAppSetting('USE_WEB_SEARCH').catch(() => false),
      getAppSetting('WEB_CONTEXT_HINT').catch(() => ''),
      getAppSetting('WEB_TOPK').catch(() => 2),
      getAppSetting('WEB_TIMEOUT_MS').catch(() => 5000),
      getAppSetting('G_CSE_API_KEY').catch(() => undefined),
      getAppSetting('G_CSE_CX').catch(() => undefined),
      getAppSetting('WEB_PROVIDER').catch(() => 'google_cse'),
    ]);
    const base: WebSearchConfig = {
      ...defaults,
      enabled: Boolean(enabled === true || String(enabled).toLowerCase() === 'true'),
      hint: typeof hint === 'string' ? hint : '',
      topK: Math.max(1, Math.min(5, Number(topK || defaults.topK) || defaults.topK)),
      timeoutMs: Number(timeoutMs || defaults.timeoutMs) || defaults.timeoutMs,
      provider: (['google_cse','serpapi','tavily'].includes(String(provider)) ? String(provider) : 'google_cse') as any,
      apiKey: typeof apiKey === 'string' ? apiKey : undefined,
      cx: typeof cx === 'string' ? cx : undefined,
    };
    // Fallback local em DEV: permite testar sem Supabase
    try {
      const local: any = (globalThis as any).APP_CONFIG_LOCAL;
      if (local) {
        if (base.enabled === false && local.USE_WEB_SEARCH === true) base.enabled = true;
        if (!base.apiKey && typeof local.G_CSE_API_KEY === 'string') base.apiKey = local.G_CSE_API_KEY;
        if (!base.cx && typeof local.G_CSE_CX === 'string') base.cx = local.G_CSE_CX;
        if (typeof local.WEB_TOPK === 'number') base.topK = Math.max(1, Math.min(5, local.WEB_TOPK));
        if (typeof local.WEB_TIMEOUT_MS === 'number') base.timeoutMs = local.WEB_TIMEOUT_MS;
        if (typeof local.WEB_PROVIDER === 'string') base.provider = local.WEB_PROVIDER;
      }
    } catch {}
    return base;
  } catch {
    return { ...defaults };
  }
}

export async function searchWeb(query: string, cfg?: Partial<WebSearchConfig>): Promise<WebSource[]> {
  const base = await loadConfig();
  const merged: WebSearchConfig = { ...base, ...(cfg || {}) } as WebSearchConfig;
  const q = (query || '').trim().slice(0, 256);
  if (!merged.enabled) { dbg('[web] disabled by USE_WEB_SEARCH=false'); return []; }
  if (!q) { dbg('[web] skipped: empty query'); return []; }

  // métricas em memória
  // @ts-ignore
  if (!globalThis.__WEBSEARCH_STATS__) globalThis.__WEBSEARCH_STATS__ = { calls: 0, hits: 0, timeMs: [] as number[] };
  // @ts-ignore
  const stats = globalThis.__WEBSEARCH_STATS__ as { calls: number; hits: number; timeMs: number[] };
  const t0 = performance.now();
  stats.calls += 1;

  // Seleção automática de provider por prioridade:
  // 1) Tavily (se houver chave) → 2) Google CSE (se houver key+cx) → 3) nenhum ([])
  let results: WebSource[] = [];
  const webProvider = merged.provider;
  let tavilyKey: any = await getAppSetting('TAVILY_API_KEY').catch(() => undefined);
  tavilyKey = normalizeSettingString(tavilyKey) || tavilyKey;
  if (!tavilyKey) {
    // fallback local para DEV
    const local: any = (globalThis as any).APP_CONFIG_LOCAL;
    if (local && typeof local.TAVILY_API_KEY === 'string' && local.TAVILY_API_KEY.trim()) {
      tavilyKey = local.TAVILY_API_KEY.trim();
    }
  }
  const qCombined = q + (merged.hint ? ` ${merged.hint}` : '');
  const hasTavily = typeof tavilyKey === 'string' && tavilyKey.trim().length > 0;
  const hasCse = !!(merged.apiKey && merged.cx);
  if (hasTavily || webProvider === 'tavily') {
    if (!hasTavily) {
      dbg('[web] provider=tavily but no TAVILY_API_KEY');
      results = [];
    } else {
      dbg('[web] provider=tavily', { topK: merged.topK, timeout: merged.timeoutMs });
      results = await tavilySearch(qCombined, {
        apiKey: (tavilyKey as string).trim(),
        topK: merged.topK,
        timeoutMs: merged.timeoutMs,
      }).catch(() => []);
    }
  } else if (hasCse) {
    dbg('[web] provider=google_cse', { topK: merged.topK, timeout: merged.timeoutMs });
    results = await searchGoogleCse(qCombined, merged).catch(() => []);
  } else {
    dbg('[web] skipped: no provider keys found');
    results = [];
  }
  const t1 = performance.now();
  const dt = Math.round(t1 - t0);
  stats.timeMs.push(dt);
  if (results.length > 0) stats.hits += 1;
  addSample({ step: 'web_search', ms: dt });
  dbg('[web] results=', results.length);

  // a cada 20 chamadas, log de resumo DEV
  if (stats.calls % 20 === 0 && (import.meta as any)?.env?.DEV) {
    const rate = ((stats.hits / Math.max(1, stats.calls)) * 100).toFixed(1);
    const summary = getSummary();
    // eslint-disable-next-line no-console
    console.debug('[AI][web] calls=', stats.calls, 'hit_rate=%', rate, 'p50/p95 ms (web/kd/ko)=',
      summary['web_search'] ? `${summary['web_search'].p50}/${summary['web_search'].p95}` : '0/0',
      summary['kd_match'] ? `${summary['kd_match'].p50}/${summary['kd_match'].p95}` : '0/0',
      summary['ko_match'] ? `${summary['ko_match'].p50}/${summary['ko_match'].p95}` : '0/0');
  }

  return results;
}

export function summarizeForContext(sources: WebSource[], maxChars: number): string {
  if (!sources || sources.length === 0) return '';
  const lines: string[] = ['### Informações Externas'];
  for (const s of sources) {
    const title = (s.title || '').trim();
    let sn = (s.snippet || '').trim();
    if (sn.length > 300) sn = sn.slice(0, 300) + '…';
    const line = `- ${title} — ${sn}`;
    lines.push(line);
    const current = lines.join('\n');
    if (current.length >= maxChars) break;
  }
  return lines.join('\n');
}


